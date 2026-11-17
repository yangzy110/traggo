import moment from 'moment';
import {parseCsv} from '../utils/csv';

export const MAX_IMPORT_ROWS = 1500;

// A row of the file, the user can change it while the problems are solved.
export interface WorkRow {
    // the line in the file (the header is line 1), it identifies the row
    line: number;
    // the times as text (2026-10-16 08:00:00), the text is kept if it is not a valid time
    start: string;
    end: string;
    note: string;
    tags: string[];
    // the column DURATION(hour), if the file has one
    durationHours?: number;
    // the user accepted that start and end differ from the duration
    durationAccepted?: boolean;
}

export const TIME_TEXT_FORMAT = 'YYYY-MM-DD HH:mm:ss';

const TIME_FORMATS = [
    TIME_TEXT_FORMAT,
    'YYYY-MM-DD HH:mm',
    'YYYY-MM-DD H:mm:ss',
    'YYYY-MM-DD H:mm',
    'YYYY/M/D HH:mm:ss',
    'YYYY/M/D HH:mm',
    'YYYY/M/D H:mm:ss',
    'YYYY/M/D H:mm',
    'YYYY-MM-DDTHH:mm:ss',
    'YYYY-MM-DDTHH:mm',
];

// The times of the file are times of the browser.
export const parseTime = (value: string): moment.Moment | undefined => {
    const parsed = moment(value.trim(), TIME_FORMATS, true);
    return parsed.isValid() ? parsed : undefined;
};

// start and end are sent with the offset of the browser
export const toIso = (value: string): string => parseTime(value)!.format();

export type TimeIssue =
    | {kind: 'format'; message: string}
    | {kind: 'order'; message: string}
    | {kind: 'duration'; message: string; calculatedHours: number};

const roundHours = (hours: number) => Math.round(hours * 100) / 100;

// The problems of the time: not a valid time, the end is not after the start, or the duration of the file does not fit.
export const timeIssue = (row: WorkRow): TimeIssue | undefined => {
    const start = parseTime(row.start);
    const end = parseTime(row.end);
    if (!start || !end) {
        return {kind: 'format', message: '开始或结束时间的格式不正确，应为 2026-10-16 08:00:00'};
    }
    if (!end.isAfter(start)) {
        return {kind: 'order', message: '结束时间必须晚于开始时间'};
    }
    const calculatedHours = roundHours(end.diff(start, 'seconds') / 3600);
    if (row.durationHours !== undefined && !row.durationAccepted && Math.abs(calculatedHours - row.durationHours) > 1 / 60) {
        return {
            kind: 'duration',
            calculatedHours,
            message: `文件里的时长是 ${row.durationHours} 小时，但开始到结束是 ${calculatedHours} 小时`,
        };
    }
    return undefined;
};

// end = start + duration of the file
export const endFromDuration = (row: WorkRow): string => {
    const start = parseTime(row.start);
    return start && row.durationHours !== undefined
        ? start
              .clone()
              .add(Math.round(row.durationHours * 3600), 'seconds')
              .format(TIME_TEXT_FORMAT)
        : row.end;
};

const HEADERS = {
    start: ['starting time', 'start', 'start time', '开始', '开始时间'],
    end: ['ending time', 'end', 'end time', '结束', '结束时间'],
    note: ['content', 'note', '内容', '备注'],
    tags: ['category', 'tags', 'tag', '分类', '标签'],
    duration: ['duration(hour)', 'duration', '时长', '时长(小时)'],
};

const columnOf = (header: string[], names: string[]) => header.findIndex((h) => names.includes(h.trim().toLowerCase()));

// the cell as it is shown for the user: a valid time is written in the standard format
const timeText = (cell: string): string => {
    const parsed = parseTime(cell || '');
    return parsed ? parsed.format(TIME_TEXT_FORMAT) : (cell || '').trim();
};

// Reads the rows of a csv file like the export creates it. Returns an error message if the file cannot be used.
export const parseImportFile = (text: string): {rows: WorkRow[]} | {error: string} => {
    const table = parseCsv(text);
    if (table.length === 0) {
        return {error: '文件是空的'};
    }
    const header = table[0];
    const start = columnOf(header, HEADERS.start);
    const end = columnOf(header, HEADERS.end);
    if (start < 0 || end < 0) {
        return {error: '找不到“STARTING TIME”和“ENDING TIME”列，请使用导出的文件格式'};
    }
    const note = columnOf(header, HEADERS.note);
    const tags = columnOf(header, HEADERS.tags);
    const duration = columnOf(header, HEADERS.duration);
    const rows: WorkRow[] = [];
    table.slice(1).forEach((cells, index) => {
        if (cells.every((cell) => cell.trim() === '')) {
            return;
        }
        const hours = duration >= 0 ? parseFloat((cells[duration] || '').replace(',', '.')) : NaN;
        rows.push({
            line: index + 2,
            start: timeText(cells[start]),
            end: timeText(cells[end]),
            note: note >= 0 ? cells[note] || '' : '',
            tags:
                tags >= 0
                    ? (cells[tags] || '')
                          .split(/[;；]/)
                          .map((tag) => tag.trim())
                          .filter((tag) => tag !== '')
                    : [],
            durationHours: Number.isNaN(hours) ? undefined : hours,
        });
    });
    return {rows};
};

// ---- resolving the problems of the content and the tags ----

export interface UpdateEntry {
    id: number;
    note: string;
    tags: string[];
}

export const tagKey = (label: string): string => label.split(':')[0].trim();

// Work contents are joined, the content of the other one is not added again if it is the same or part of it already.
export const mergeNote = (base: string, other: string): string => {
    if (!other.trim() || base.includes(other)) {
        return base;
    }
    if (!base.trim()) {
        return other;
    }
    return `${base}；${other}`;
};

// The tags of both, a key is used only once (the first one wins).
export const mergeTags = (base: string[], other: string[]): string[] => {
    const keys = new Set(base.map(tagKey));
    return [...base, ...other.filter((label) => !keys.has(tagKey(label)))];
};
