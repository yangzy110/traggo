import moment from 'moment-timezone';
import {formatDurationZh} from '../utils/duration';
import {asText, downloadCsv} from '../utils/csv';

export const DAY_FORMAT = 'YYYY-MM-DD';
export const MAX_LOG_DAYS = 31;
export const MAX_STATS_DAYS = 366;

interface Span {
    start: string;
    end: string | null;
}

export interface LogEntry extends Span {
    member: string;
    tags: Array<{key: string; value: string}> | null;
    note: string;
}

// The server returns times with the offset of their owner, parseZone keeps the wall-clock time the owner saw.
export const clock = (value: string) => moment.parseZone(value).format('HH:mm');

export const spanSeconds = (start: string, end: string) =>
    Math.max(0, moment.parseZone(end).diff(moment.parseZone(start), 'seconds'));

export const formatDuration = (seconds: number) => (seconds < 60 ? '不足1分钟' : formatDurationZh(seconds));

// Returns an error message if the range cannot be queried.
export const validateRange = (from: string, to: string, maxDays: number): string | null => {
    const start = moment(from, DAY_FORMAT, true);
    const end = moment(to, DAY_FORMAT, true);
    if (!start.isValid() || !end.isValid()) {
        return '请选择有效的日期';
    }
    if (start.isAfter(end)) {
        return '开始日期不能晚于结束日期';
    }
    if (end.diff(start, 'days') + 1 > maxDays) {
        return `时间范围不能超过 ${maxDays} 天`;
    }
    return null;
};

const DATETIME_FORMAT = 'YYYY-MM-DD HH:mm';

export const logCsvRows = (entries: LogEntry[], withMember: boolean): string[][] => {
    const header = [...(withMember ? ['成员'] : []), '开始', '结束', '时长(小时)', '标签', '备注'];
    const rows = entries
        .filter((entry) => !!entry.end)
        .map((entry) => [
            ...(withMember ? [entry.member] : []),
            asText(moment.parseZone(entry.start).format(DATETIME_FORMAT)),
            asText(moment.parseZone(entry.end!).format(DATETIME_FORMAT)),
            (spanSeconds(entry.start, entry.end!) / 3600).toFixed(2),
            (entry.tags || []).map((tag) => tag.key + ':' + tag.value).join('; '),
            entry.note,
        ]);
    return [header, ...rows];
};

export const exportLog = (filename: string, entries: LogEntry[], withMember: boolean) => {
    downloadCsv(filename, logCsvRows(entries, withMember));
};

const safeFilePart = (value: string) => value.replace(/[^\w一-龥-]+/g, '_');

export const memberFileName = (name: string, from: string, to: string) => `traggo-${safeFilePart(name)}_${from}_${to}.csv`;
