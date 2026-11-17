import * as React from 'react';

import {useApolloClient, useQuery} from '@apollo/client/react';
import {useSnackbar} from 'notistack';
import * as gqlTimeSpan from '../gql/timeSpan';
import * as gqlTag from '../gql/tags';
import * as gqlUser from '../gql/user';
import {
    CheckImport,
    CheckImportVariables,
    CurrentUser,
    ImportTimeSpans,
    ImportTimeSpansVariables,
    InputImportRow,
    Tags,
} from '../gql/types';
import {handleError} from '../utils/errors';
import {downloadCsv} from '../utils/csv';
import {translateServerError} from '../utils/serverErrors';
import {MAX_IMPORT_ROWS, parseImportFile, timeIssue, toIso, WorkRow} from './importcsv';
import {ContentAction, ImportState, reasonOf, resolveContent, RowResult, Tab as TabName, tabOf} from './importstate';
import {CSV_HEADER} from './teamutils';
import {TAB_ORDER} from './ImportBody';

const EMPTY: ImportState = {rows: [], updates: [], handled: []};

const toInput = (row: WorkRow): InputImportRow => ({
    line: row.line,
    start: toIso(row.start),
    end: toIso(row.end),
    note: row.note,
    tags: row.tags,
});

type Step = 'pick' | 'review' | 'done';

// The state and the actions of the import.
export const useImportFlow = (onImported: () => void) => {
    const client = useApolloClient();
    const {enqueueSnackbar} = useSnackbar();
    const {data: currentUser} = useQuery<CurrentUser>(gqlUser.CurrentUser);
    const {data: tagData} = useQuery<Tags>(gqlTag.Tags);
    const admin = !!(currentUser && currentUser.user && currentUser.user.admin);
    const existingTags = ((tagData && tagData.tags) || []).map((tag) => tag.key).sort();

    const [open, setOpen] = React.useState(false);
    const [step, setStep] = React.useState<Step>('pick');
    const [fileName, setFileName] = React.useState('');
    const [error, setError] = React.useState('');
    const [state, setState] = React.useState<ImportState>(EMPTY);
    const [results, setResults] = React.useState<RowResult[]>([]);
    const [tabs, setTabs] = React.useState<Map<number, TabName>>(new Map());
    const [createTags, setCreateTags] = React.useState<string[]>([]);
    const [dirty, setDirty] = React.useState(false);
    const [busy, setBusy] = React.useState(false);
    const [tab, setTab] = React.useState<TabName>('ready');
    // the user changed something since the file was read
    const [touched, setTouched] = React.useState(false);
    const [confirmClose, setConfirmClose] = React.useState(false);
    const [done, setDone] = React.useState({imported: 0, updated: 0});

    const resultMap = new Map(results.map((r) => [r.line, r]));
    const rowsOf = (name: TabName) => state.rows.filter((row) => tabs.get(row.line) === name);
    const counts: Record<TabName, number> = {
        time: rowsOf('time').length,
        content: rowsOf('content').length,
        tags: rowsOf('tags').length,
        ready: rowsOf('ready').length,
    };
    const duplicates = rowsOf('ready').filter((row) => (resultMap.get(row.line) || {status: ''}).status === 'Duplicate').length;
    const importable = counts.ready - duplicates;
    const problems = counts.time + counts.content + counts.tags;

    const reset = () => {
        setStep('pick');
        setError('');
        setState(EMPTY);
        setResults([]);
        setTabs(new Map());
        setCreateTags([]);
        setDirty(false);
        setTouched(false);
    };

    const runCheck = async (next: ImportState, create: string[]) => {
        setBusy(true);
        setError('');
        try {
            const response = await client.query<CheckImport, CheckImportVariables>({
                query: gqlTimeSpan.CheckImport,
                variables: {
                    rows: next.rows.filter((row) => !timeIssue(row)).map(toInput),
                    createTags: create,
                    updates: next.updates.map(({id, note, tags}) => ({id, note, tags})),
                },
                fetchPolicy: 'no-cache',
            });
            if (!response.data) {
                throw response.error || new Error('no data received');
            }
            const checked = response.data.checkImport.rows as RowResult[];
            const checkedByLine = new Map(checked.map((r) => [r.line, r]));
            const assigned = new Map(next.rows.map((row) => [row.line, tabOf(row, checkedByLine.get(row.line))]));
            setResults(checked);
            setTabs(assigned);
            setDirty(false);
            // stay in the tab as long as it has problems, otherwise go to the next tab with problems
            setTab((current) => {
                const count = (name: TabName) => [...assigned.values()].filter((t) => t === name).length;
                return current !== 'ready' && count(current) > 0 ? current : TAB_ORDER.find((name) => count(name) > 0) || 'ready';
            });
            setStep('review');
        } catch (e) {
            setError(translateServerError(e instanceof Error ? e.message : String(e)));
        } finally {
            setBusy(false);
        }
    };

    const onFile = async (file: File) => {
        reset();
        setFileName(file.name);
        const parsed = parseImportFile(await file.text());
        if ('error' in parsed) {
            setError(parsed.error);
        } else if (parsed.rows.length > MAX_IMPORT_ROWS) {
            setError(`一次最多导入 ${MAX_IMPORT_ROWS} 行，这个文件有 ${parsed.rows.length} 行，请分批导入`);
        } else if (parsed.rows.length === 0) {
            setError('文件里没有数据行');
        } else {
            const initial = {...EMPTY, rows: parsed.rows};
            setState(initial);
            await runCheck(initial, []);
        }
    };

    // a change of the user, it is checked when the user submits it
    const change = (next: ImportState, create = createTags) => {
        setTouched(true);
        setState(next);
        setCreateTags(create);
        setDirty(true);
    };
    const changeRow = (line: number, patch: Partial<WorkRow>) =>
        change({...state, rows: state.rows.map((row) => (row.line === line ? {...row, ...patch} : row))});
    const changeRowsOfTab = (name: TabName, patch: (row: WorkRow) => Partial<WorkRow>) =>
        change({
            ...state,
            rows: state.rows.map((row) => (tabs.get(row.line) === name && timeIssue(row) ? {...row, ...patch(row)} : row)),
        });
    const resolve = (line: number, action: ContentAction) => {
        const result = resultMap.get(line);
        if (result) {
            change(resolveContent(state, result, action));
        }
    };

    // the rows which are not imported, with the reason
    const downloadLeft = () => {
        const left = state.rows
            .filter((row) => tabs.get(row.line) !== 'ready')
            .map((row) => ({row, reason: reasonOf(row, tabs.get(row.line) || 'ready', resultMap.get(row.line))}));
        const skipped = state.handled.filter((h) => h.text.startsWith('保留')).map((h) => ({row: h.row, reason: h.text}));
        downloadCsv('traggo-not-imported.csv', [
            [...CSV_HEADER, 'REASON'],
            ...[...left, ...skipped].map(({row, reason}) => [
                row.start.slice(0, 10),
                row.start,
                row.end,
                row.durationHours === undefined ? '' : String(row.durationHours),
                '',
                row.note,
                row.tags.join('; '),
                reason,
            ]),
        ]);
    };

    const doImport = async () => {
        setBusy(true);
        try {
            const response = await client.mutate<ImportTimeSpans, ImportTimeSpansVariables>({
                mutation: gqlTimeSpan.ImportTimeSpans,
                variables: {
                    rows: state.rows.filter((row) => !timeIssue(row)).map(toInput),
                    createTags,
                    updates: state.updates.map(({id, note, tags}) => ({id, note, tags})),
                },
            });
            const result = response.data && response.data.importTimeSpans;
            // tags may have been created, and the usage of the tags changed
            await client.refetchQueries({include: ['Tags']});
            setDone({imported: result ? result.imported : 0, updated: result ? result.updated : 0});
            setStep('done');
            onImported();
        } catch (e) {
            handleError('导入失败', enqueueSnackbar)(e as Error);
        } finally {
            setBusy(false);
        }
    };

    // work which would be lost
    const hasWork = step === 'review' && touched;
    const close = () => (hasWork ? setConfirmClose(true) : setOpen(false));
    const left = problems + state.handled.filter((h) => h.text.startsWith('保留')).length;

    return {
        open,
        setOpen,
        step,
        fileName,
        setFileName,
        error,
        state,
        createTags,
        dirty,
        busy,
        tab,
        setTab,
        confirmClose,
        setConfirmClose,
        done,
        resultMap,
        results,
        tabs,
        rowsOf,
        counts,
        duplicates,
        problems,
        importable,
        admin,
        existingTags,
        reset,
        onFile,
        change,
        changeRow,
        changeRowsOfTab,
        resolve,
        downloadLeft,
        doImport,
        close,
        left,
        runCheck,
    };
};
