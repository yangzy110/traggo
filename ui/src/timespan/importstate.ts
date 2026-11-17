import {mergeNote, mergeTags, tagKey, timeIssue, UpdateEntry, WorkRow} from './importcsv';

// The result of the server for a row (see checkImport).
export interface RowResult {
    line: number;
    status: 'Ok' | 'Duplicate' | 'Conflict' | 'MissingTags' | 'Error';
    message: string;
    missingTags: string[];
    conflict?: {
        source: 'Existing' | 'File';
        id?: number | null;
        line?: number | null;
        start: string;
        end: string;
        note: string;
        tags: string[];
        sameTime: boolean;
    } | null;
}

// The working set of the import: the rows, the changes of existing time spans, and what was done with the removed rows.
export interface ImportState {
    rows: WorkRow[];
    updates: UpdateEntry[];
    handled: Array<{line: number; text: string; row: WorkRow}>;
}

export type Tab = 'time' | 'content' | 'tags' | 'ready';

// Every row is in exactly one tab, the time comes before the content and the content before the tags.
export const tabOf = (row: WorkRow, result: RowResult | undefined): Tab => {
    if (timeIssue(row)) {
        return 'time';
    }
    if (!result) {
        return 'ready';
    }
    switch (result.status) {
        case 'Error':
            return 'time';
        case 'Conflict':
            return 'content';
        case 'MissingTags':
            return 'tags';
        default:
            return 'ready';
    }
};

export type ContentAction = 'skip' | 'merge' | 'overwrite';

const ACTION_TEXT: Record<ContentAction, string> = {
    skip: '保留已有记录，跳过本行',
    merge: '内容合并到时间相同的记录',
    overwrite: '用文件的内容覆盖时间相同的记录',
};

const without = (rows: WorkRow[], line: number) => rows.filter((row) => row.line !== line);

// The tags of the row which can be used: the missing tags are left out.
const usableTags = (row: WorkRow, result: RowResult) => row.tags.filter((label) => !result.missingTags.includes(tagKey(label)));

// Solves the content problem of a row. Returns the state unchanged if the action cannot be used for the row.
export const resolveContent = (state: ImportState, result: RowResult, action: ContentAction): ImportState => {
    const row = state.rows.find((r) => r.line === result.line);
    const conflict = result.conflict;
    if (!row || !conflict) {
        return state;
    }
    const handled = [...state.handled, {line: row.line, text: ACTION_TEXT[action], row}];
    if (action === 'skip') {
        return {...state, rows: without(state.rows, row.line), handled};
    }
    if (!conflict.sameTime) {
        return state;
    }
    const tags = usableTags(row, result);
    const apply = (base: {note: string; tags: string[]}) =>
        action === 'merge' ? {note: mergeNote(base.note, row.note), tags: mergeTags(base.tags, tags)} : {note: row.note, tags};

    if (conflict.source === 'Existing' && conflict.id) {
        const id = conflict.id;
        const current = state.updates.find((u) => u.id === id) || {id, note: conflict.note, tags: conflict.tags};
        const updated = {id, ...apply(current)};
        return {rows: without(state.rows, row.line), updates: [...state.updates.filter((u) => u.id !== id), updated], handled};
    }
    // the other row is an earlier row of the file
    const target = state.rows.find((r) => r.line === conflict.line);
    if (!target) {
        return state;
    }
    const changed = apply({note: target.note, tags: target.tags});
    return {
        ...state,
        rows: without(state.rows, row.line).map((r) => (r.line === target.line ? {...r, ...changed} : r)),
        handled,
    };
};

// All conflicts of the rows (in the order of the file, rows depend on earlier rows).
export const resolveAllContent = (
    state: ImportState,
    results: RowResult[],
    action: ContentAction,
    onlySameTime: boolean
): ImportState => {
    let next = state;
    results
        .filter((r) => r.status === 'Conflict' && r.conflict && (!onlySameTime || r.conflict.sameTime))
        .sort((a, b) => a.line - b.line)
        .forEach((r) => {
            const row = next.rows.find((x) => x.line === r.line);
            if (row && !timeIssue(row)) {
                next = resolveContent(next, r, action);
            }
        });
    return next;
};

const mapLabel = (label: string, from: string, to: string | null): string | null => {
    if (tagKey(label) !== from) {
        return label;
    }
    if (to === null) {
        return null;
    }
    const value = label.includes(':') ? label.slice(label.indexOf(':') + 1) : '';
    return value ? `${to}:${value}` : to;
};

// Replaces a tag in all rows by another tag (to is null: the tag is removed). A key is used only once per row.
export const changeTag = (rows: WorkRow[], from: string, to: string | null): WorkRow[] =>
    rows.map((row) => {
        if (!row.tags.some((label) => tagKey(label) === from)) {
            return row;
        }
        const seen = new Set<string>();
        const tags = row.tags
            .map((label) => mapLabel(label, from, to))
            .filter((label): label is string => label !== null)
            .filter((label) => {
                const key = tagKey(label);
                return seen.has(key) ? false : !!seen.add(key);
            });
        return {...row, tags};
    });

// The tags which do not exist, with the lines of the rows which use them.
export const missingTagGroups = (rows: WorkRow[], results: RowResult[]): Array<{name: string; lines: number[]}> => {
    const groups = new Map<string, number[]>();
    results
        .filter((r) => r.status === 'MissingTags' && rows.some((row) => row.line === r.line && !timeIssue(row)))
        .forEach((r) => r.missingTags.forEach((name) => groups.set(name, [...(groups.get(name) || []), r.line])));
    return [...groups.entries()].map(([name, lines]) => ({name, lines})).sort((a, b) => a.name.localeCompare(b.name));
};

export const TAB_LABEL: Record<Tab, string> = {time: '时间问题', content: '内容问题', tags: '标签问题', ready: '可导入'};

// Why the row is not imported, in words.
export const reasonOf = (row: WorkRow, tab: Tab, result: RowResult | undefined): string => {
    const issue = timeIssue(row);
    if (issue) {
        return `${TAB_LABEL.time}：${issue.message}`;
    }
    if (tab === 'content' && result && result.conflict) {
        const c = result.conflict;
        return `${TAB_LABEL.content}：与${c.source === 'Existing' ? '已有记录' : `文件第 ${c.line} 行`}冲突（${c.note || '无内容'}）`;
    }
    if (tab === 'tags' && result) {
        return `${TAB_LABEL.tags}：标签不存在（${result.missingTags.join('、')}）`;
    }
    return tab === 'time' && result ? `${TAB_LABEL.time}：${result.message}` : '';
};
