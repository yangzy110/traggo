import moment from 'moment-timezone';

export const uglyConvertToLocalTime = (m: moment.Moment): moment.Moment => {
    const withoutTimeZone: string = m.format('YYYY-MM-DDTHH:mm:ss');
    return moment(withoutTimeZone);
};

export const inUserTz = (m: moment.Moment): moment.Moment => m.tz(moment.tz.guess());
