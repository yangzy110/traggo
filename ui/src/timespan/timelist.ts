import moment from 'moment';
import {TimeSpans_timeSpans_timeSpans} from '../gql/types';

export interface DayGroup {
    // YYYY-MM-DD
    key: string;
    title: string;
    seconds: number;
    timeSpans: TimeSpans_timeSpans_timeSpans[];
}

const dayTitle = (day: moment.Moment, now: moment.Moment) => {
    const title = day.format('LL dddd');
    if (day.isSame(now, 'day')) {
        return `${title}(今天)`;
    }
    if (day.isSame(moment(now).subtract(1, 'day'), 'day')) {
        return `${title}(昨天)`;
    }
    return title;
};

// Groups the time spans by the day they started on, the newest day and the newest time span first.
export const groupByDay = (timeSpans: TimeSpans_timeSpans_timeSpans[], now: moment.Moment): DayGroup[] => {
    const groups: Record<string, DayGroup> = {};
    [...timeSpans]
        .sort((a, b) => moment(b.start).valueOf() - moment(a.start).valueOf())
        .forEach((timeSpan) => {
            const start = moment(timeSpan.start);
            const key = start.format('YYYY-MM-DD');
            const group = groups[key] || (groups[key] = {key, title: dayTitle(start, now), seconds: 0, timeSpans: []});
            group.timeSpans.push(timeSpan);
            if (timeSpan.end) {
                group.seconds += Math.max(0, moment(timeSpan.end).diff(start, 'seconds'));
            }
        });
    return Object.keys(groups)
        .sort((a, b) => b.localeCompare(a))
        .map((key) => groups[key]);
};
