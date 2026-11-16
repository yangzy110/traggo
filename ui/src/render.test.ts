// @vitest-environment jsdom
//
// Renders every page of the ui with data which is generated from schema.graphql. This catches errors which the
// type checker cannot find: crashes while rendering, invalid props, invalid graphql variables, mutated query results.
// The generated graphql types are needed (`yarn generate`), the tests have to be executed in the directory ui.
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import React, {act} from 'react';
import {createRoot, type Root as ReactRoot} from 'react-dom/client';
import {addMocksToSchema} from '@graphql-tools/mock';
import {makeExecutableSchema} from '@graphql-tools/schema';

// graphql-tools uses the commonjs build of graphql, using the esm build here would result in two instances of graphql
const {graphql} = createRequire(import.meta.url)('graphql') as typeof import('graphql');

(globalThis as unknown as {IS_REACT_ACT_ENVIRONMENT: boolean}).IS_REACT_ACT_ENVIRONMENT = true;

// the tests are executed in the directory ui
const schemaPath = resolve(process.cwd(), '../schema.graphql');

let counter = 10;
let entryType = 'LineChart';
let dashboardCount = 0;
const schema = addMocksToSchema({
    schema: makeExecutableSchema({
        typeDefs: readFileSync(schemaPath, 'utf8'),
    }),
    mocks: {
        Time: () => '2026-11-16T10:00:00+00:00',
        Int: () => ++counter,
        Float: () => 3600,
        String: () => 'str' + ++counter,
        Boolean: () => true,
        // the dashboards of every response have the ids 100 and 101
        Dashboard: () => ({id: [100, 101][dashboardCount++ % 2]}),
        TagDefinition: () => ({color: '#336699', key: 'key' + ++counter}),
        StatsSelection: () => ({rangeId: null}),
        // enums are chosen randomly otherwise
        EntryType: () => entryType,
        StatsInterval: () => 'Daily',
        Theme: () => 'MaterialLight',
        DateLocale: () => 'British',
        WeekDay: () => 'Monday',
        DateTimeInputStyle: () => 'Fancy',
        DeviceType: () => 'LongExpiry',
        OverrideMode: () => 'Override',
        Role: () => 'USER',
        RelativeOrStaticRange: () => ({from: 'now-7d', to: 'now'}),
    },
});

globalThis.fetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
    const body = JSON.parse(String(init && init.body));
    const result = await graphql({
        schema,
        source: body.query,
        variableValues: body.variables,
        operationName: body.operationName,
    });
    return new Response(JSON.stringify(result), {status: 200, headers: {'content-type': 'application/json'}});
}) as typeof fetch;

// jsdom does not implement these
Object.assign(window, {
    matchMedia: (query: string) => ({
        matches: false,
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        onchange: null,
        dispatchEvent: () => false,
    }),
    ResizeObserver: class {
        observe() {}
        unobserve() {}
        disconnect() {}
    },
    IntersectionObserver: class {
        observe() {}
        unobserve() {}
        disconnect() {}
        takeRecords() {
            return [];
        }
    },
    scrollTo: () => {},
});
Element.prototype.scrollIntoView = () => {};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const text = () => document.body.textContent || '';

// Waits until the check succeeds, the queries are answered asynchronously and the speed of the machine is unknown.
const waitFor = async (check: () => boolean, what: string, timeout = 15000) => {
    const start = Date.now();
    while (!check()) {
        if (Date.now() - start > timeout) {
            throw new Error(`timeout while waiting for ${what}, the text was: ${text().slice(0, 300)}`);
        }
        await act(async () => {
            await sleep(50);
        });
    }
};

// Gives the components some time to update after the expected state was reached, errors are logged afterwards.
const settle = async () => {
    for (let i = 0; i < 3; i++) {
        await act(async () => {
            await sleep(100);
        });
    }
};

const click = async (element: Element) => {
    await act(async () => {
        element.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true}));
    });
};

const button = (text: string) => [...document.querySelectorAll('button')].find((b) => b.textContent === text);

// Errors which are logged by react (invalid props, duplicate keys, state updates while rendering, ...) or thrown
// while rendering fail the test.
const errors: string[] = [];
let root: ReactRoot | undefined;

beforeEach(() => {
    errors.length = 0;
    vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
        errors.push(args.map((a) => (a instanceof Error ? a.stack : String(a))).join(' '));
    });
    window.addEventListener('error', onUncaughtError);
});

const onUncaughtError = (event: ErrorEvent) => {
    errors.push(String((event.error && event.error.stack) || event.message));
};

afterEach(async () => {
    if (root) {
        const current = root;
        root = undefined;
        await act(async () => current.unmount());
    }
    window.removeEventListener('error', onUncaughtError);
    vi.restoreAllMocks();
    expect(errors).toEqual([]);
});

const render = async (route: string) => {
    window.location.hash = '#' + route;
    document.body.innerHTML = '<div id="root"></div>';
    const {Root} = await import('./Root');
    root = createRoot(document.getElementById('root')!);
    await act(async () => root!.render(React.createElement(Root)));
};

describe('pages', () => {
    const pages: Array<[route: string, expected: string]> = [
        ['/timesheet/calendar', '导出 CSV'],
        ['/timesheet/list', 'Active Timers'],
        ['/team', '导出 CSV'],
        ['/team/3', '成员不存在'],
        ['/stats', '成员工作量'],
        ['/dashboards', 'Create Dashboard'],
        ['/dashboard/100/some-name', 'Edit Dashboard'],
        ['/user/settings', 'Date Locale'],
        ['/user/devices', 'Create Device'],
        ['/user/tags', 'Create Tag'],
        ['/admin/users', 'Create User'],
        // the user is logged in, the login page redirects to the calendar
        ['/user/login', '导出 CSV'],
        ['/does/not/exist', '导出 CSV'],
    ];

    it.each(pages)('renders %s', async (route, expected) => {
        await render(route);
        await waitFor(() => text().includes(expected), expected);
        await settle();
    });
});

describe('calendar', () => {
    // The height has to be a valid css value: fullcalendar does not know the value `parent` of the former version.
    // Without a height the calendar collapses.
    it('fills the container', async () => {
        await render('/timesheet/calendar');
        await waitFor(() => !!document.querySelector('.fc'), 'the calendar');
        expect((document.querySelector('.fc') as HTMLElement).style.height).toBe('100%');
        await settle();
    });
});

describe('dashboard entries', () => {
    afterEach(() => {
        entryType = 'LineChart';
    });

    // one of the entries of the first dashboard is rendered by the entry types, a failed query is shown as text
    it.each(['LineChart', 'BarChart', 'StackedBarChart', 'PieChart', 'HorizontalTable', 'VerticalTable'])(
        'renders %s',
        async (type) => {
            entryType = type;
            await render('/dashboard/100/some-name');
            await waitFor(() => text().includes('Edit Dashboard'), 'Edit Dashboard');
            await settle();
            expect(text()).not.toContain('error:');
            expect(document.querySelectorAll('.MuiPaper-root').length).toBeGreaterThan(2);
        }
    );
});

describe('navigation', () => {
    it('opens the menu and navigates', async () => {
        await render('/team');
        await waitFor(() => !!button('其他'), 'the menu button');

        await click(button('其他')!);
        await waitFor(() => document.querySelectorAll('[role="menuitem"]').length > 0, 'the menu items');
        const items = [...document.querySelectorAll('[role="menuitem"]')];
        expect(items.map((item) => item.textContent)).toEqual(
            expect.arrayContaining(['List', 'Tags', 'Devices', 'Settings', 'Users'])
        );

        const tags = items.find((item) => item.textContent === 'Tags')!;
        expect(tags.getAttribute('href')).toBe('#/user/tags');
        await click(tags);
        await waitFor(() => window.location.hash === '#/user/tags', 'the navigation');
    });

    it('opens the log of a member by clicking the avatar', async () => {
        await render('/team');
        await waitFor(() => !!document.querySelector('button[aria-label^="查看"]'), 'the avatar of a member');

        await click(document.querySelector('button[aria-label^="查看"]')!);
        await waitFor(() => /^#\/team\/\d+$/.test(window.location.hash), 'the navigation');
    });
});
