import {describe, expect, it} from 'vitest';
import {endFromDuration, mergeNote, mergeTags, timeIssue, WorkRow} from './importcsv';
import {changeTag, ImportState, resolveAllContent, resolveContent, RowResult, tabOf} from './importstate';

const row = (line: number, extra: Partial<WorkRow> = {}): WorkRow => ({
    line,
    start: '2026-10-16 08:00:00',
    end: '2026-10-16 09:00:00',
    note: `n${line}`,
    tags: ['a'],
    ...extra,
});

describe('timeIssue', () => {
    it('finds invalid times, a wrong order and a duration which does not fit', () => {
        expect(timeIssue(row(2))).toBeUndefined();
        expect(timeIssue(row(2, {start: 'nope'}))?.kind).toBe('format');
        expect(timeIssue(row(2, {end: '2026-10-16 07:00:00'}))?.kind).toBe('order');
        expect(timeIssue(row(2, {durationHours: 1}))).toBeUndefined();
        expect(timeIssue(row(2, {durationHours: 2}))).toMatchObject({kind: 'duration', calculatedHours: 1});
        expect(timeIssue(row(2, {durationHours: 2, durationAccepted: true}))).toBeUndefined();
    });

    it('calculates the end from the duration', () => {
        expect(endFromDuration(row(2, {durationHours: 2.5}))).toBe('2026-10-16 10:30:00');
    });
});

describe('merging', () => {
    it('joins the contents once and keeps the first tag of a key', () => {
        expect(mergeNote('a', 'b')).toBe('a；b');
        expect(mergeNote('a；b', 'b')).toBe('a；b');
        expect(mergeNote('', 'b')).toBe('b');
        expect(mergeTags(['x', 'y:1'], ['y:2', 'z'])).toEqual(['x', 'y:1', 'z']);
    });
});

describe('tabs', () => {
    const result = (status: RowResult['status']): RowResult => ({line: 2, status, message: '', missingTags: []});

    it('puts a row in exactly one tab: time, then content, then tags', () => {
        expect(tabOf(row(2, {start: 'x'}), result('Conflict'))).toBe('time');
        expect(tabOf(row(2), result('Conflict'))).toBe('content');
        expect(tabOf(row(2), result('MissingTags'))).toBe('tags');
        expect(tabOf(row(2), result('Ok'))).toBe('ready');
        expect(tabOf(row(2), result('Duplicate'))).toBe('ready');
    });
});

describe('resolving content problems', () => {
    const conflictOf = (line: number, extra: Partial<NonNullable<RowResult['conflict']>>): RowResult => ({
        line,
        status: 'Conflict',
        message: '',
        missingTags: [],
        conflict: {source: 'Existing', id: 7, start: '', end: '', note: 'old', tags: ['x'], sameTime: true, ...extra},
    });
    const state = (rows: WorkRow[]): ImportState => ({rows, updates: [], handled: []});

    it('merges into an existing time span and removes the row', () => {
        const next = resolveContent(state([row(2), row(3)]), conflictOf(2, {}), 'merge');
        expect(next.rows.map((r) => r.line)).toEqual([3]);
        expect(next.updates).toEqual([{id: 7, note: 'old；n2', tags: ['x', 'a']}]);
        expect(next.handled).toHaveLength(1);
    });

    it('merges the next row into the update which exists already', () => {
        const first = resolveContent(state([row(2), row(3)]), conflictOf(2, {}), 'merge');
        const next = resolveContent(first, conflictOf(3, {}), 'overwrite');
        expect(next.updates).toEqual([{id: 7, note: 'n3', tags: ['a']}]);
    });

    it('leaves out the tags which do not exist', () => {
        const result = {...conflictOf(2, {}), missingTags: ['a']};
        expect(resolveContent(state([row(2, {tags: ['a', 'b']})]), result, 'overwrite').updates[0].tags).toEqual(['b']);
    });

    it('changes the earlier row if the conflict is in the file', () => {
        const next = resolveContent(
            state([row(2), row(3)]),
            conflictOf(3, {source: 'File', id: null, line: 2, note: 'n2', tags: ['a']}),
            'merge'
        );
        expect(next.rows).toEqual([row(2, {note: 'n2；n3'})]);
        expect(next.updates).toEqual([]);
    });

    it('skips rows, but merges and overwrites only if the time is the same', () => {
        const partly = conflictOf(2, {sameTime: false});
        expect(resolveContent(state([row(2)]), partly, 'merge').rows).toHaveLength(1);
        expect(resolveContent(state([row(2)]), partly, 'skip').rows).toHaveLength(0);
    });

    it('resolves all rows at once', () => {
        const results = [conflictOf(2, {}), conflictOf(3, {sameTime: false})];
        const next = resolveAllContent(state([row(2), row(3)]), results, 'merge', true);
        expect(next.rows.map((r) => r.line)).toEqual([3]);
    });
});

describe('changeTag', () => {
    it('replaces and removes a tag in all rows without using a key twice', () => {
        const rows = [row(2, {tags: ['a', 'b:1']}), row(3, {tags: ['c']}), row(4, {tags: ['a', 'b']})];
        expect(changeTag(rows, 'a', 'b').map((r) => r.tags)).toEqual([['b'], ['c'], ['b']]);
        expect(changeTag(rows, 'b', 'z').map((r) => r.tags)).toEqual([['a', 'z:1'], ['c'], ['a', 'z']]);
        expect(changeTag(rows, 'a', null).map((r) => r.tags)).toEqual([['b:1'], ['c'], ['b']]);
    });
});
