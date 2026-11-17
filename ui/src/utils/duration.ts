// Formats a duration in Chinese with at most `unitCount` units, e.g. 1小时30分钟. Working time is counted in hours, never in days
// (a day of work is not 24 hours), so 26 hours are shown as 26小时.
const UNITS: Array<[name: string, seconds: number]> = [
    ['小时', 3600],
    ['分钟', 60],
    ['秒', 1],
];

export const formatDurationZh = (totalSeconds: number, unitCount = 2): string => {
    let rest = Math.max(0, Math.round(totalSeconds));
    if (rest === 0) {
        return '0秒';
    }
    const parts: string[] = [];
    for (const [name, size] of UNITS) {
        if (parts.length >= unitCount) {
            break;
        }
        const amount = Math.floor(rest / size);
        if (amount > 0 || parts.length > 0) {
            if (amount > 0) {
                parts.push(`${amount}${name}`);
            }
            rest -= amount * size;
        }
    }
    return parts.join('');
};

// The hours as a decimal number, f.ex. 12.5 小时. Used where people want to know "how many hours" at a glance.
export const formatHours = (totalSeconds: number): string => `${Math.round((Math.max(0, totalSeconds) / 3600) * 10) / 10} 小时`;
