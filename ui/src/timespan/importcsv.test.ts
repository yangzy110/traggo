import {describe, expect, it} from 'vitest';
import {parseCsv, toCsv} from '../utils/csv';
import {parseImportFile} from './importcsv';

describe('parseCsv', () => {
    it('reads quotes, line breaks inside of quotes, a BOM and windows line breaks', () => {
        expect(parseCsv('﻿a,"b,1","c ""x"""\r\n1,"two\nlines",3\r\n')).toEqual([
            ['a', 'b,1', 'c "x"'],
            ['1', 'two\nlines', '3'],
        ]);
    });

    it('reads what is written by the export', () => {
        const rows = [
            ['DATE', 'CONTENT'],
            ['2026-10-16', 'a, "b"'],
        ];
        expect(parseCsv(toCsv(rows))).toEqual(rows);
    });
});

describe('parseImportFile', () => {
    const header = 'DATE,STARTING TIME,ENDING TIME,DURATION(hour),MEMBER,CONTENT,CATEGORY';

    it('reads the rows of an export', () => {
        const result = parseImportFile(
            `${header}\n2026-10-16,2026-10-16 08:00:00,2026-10-16 09:00:00,1,chaofan.jiang,Morning meeting,WT-Orca; other\n`
        );
        if ('error' in result) {
            throw new Error(result.error);
        }
        expect(result.rows).toEqual([
            {
                line: 2,
                start: '2026-10-16 08:00:00',
                end: '2026-10-16 09:00:00',
                note: 'Morning meeting',
                tags: ['WT-Orca', 'other'],
                durationHours: 1,
            },
        ]);
    });

    it('accepts the dates which excel writes and keeps invalid times for the user to correct them', () => {
        const result = parseImportFile(
            `${header}\n,2026/10/16 8:00,2026/10/16 9:30,,,x,\n,yesterday,2026-10-16 09:00:00,,,y,\n,,,,,,\n`
        );
        if ('error' in result) {
            throw new Error(result.error);
        }
        expect(result.rows).toHaveLength(2);
        expect(result.rows[0]).toMatchObject({
            start: '2026-10-16 08:00:00',
            end: '2026-10-16 09:30:00',
            durationHours: undefined,
        });
        expect(result.rows[1].start).toBe('yesterday');
    });

    it('rejects files without the time columns', () => {
        expect(parseImportFile('a,b\n1,2\n')).toEqual({error: expect.stringContaining('STARTING TIME')});
        expect(parseImportFile('')).toEqual({error: '文件是空的'});
    });
});
