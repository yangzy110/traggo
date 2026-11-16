import * as React from 'react';
import {useSettings} from '../gql/settings';
import {CenteredSpinner} from '../common/CenteredSpinner';
import moment, {LocaleSpecification} from 'moment';
import {DateLocale, WeekDay} from '../gql/types';
import {expectNever} from '../utils/never';

// moment.locale(name, spec) would define a new locale which only consists of the spec (the names of the days are
// lost), therefore the existing locale is updated.
const applyLocale = (name: string, spec: LocaleSpecification) => {
    moment.updateLocale(name, spec);
    moment.locale(name);
};

const setLocale = (locale: DateLocale, spec: LocaleSpecification) => {
    switch (locale) {
        case DateLocale.Chinese:
            applyLocale('zh-cn', spec);
            return;
        case DateLocale.American:
            applyLocale('en', spec);
            return;
        case DateLocale.American24h:
            applyLocale('en', {
                ...spec,
                longDateFormat: {
                    LTS: 'HH:mm:ss',
                    LT: 'HH:mm',
                    L: 'MM/DD/YYYY',
                    LL: 'MMMM D, YYYY',
                    LLL: 'MMMM D, YYYY HH:mm',
                    LLLL: 'dddd, MMMM D, YYYY HH:mm',
                },
            });
            return;
        case DateLocale.Australian:
            applyLocale('en-au', spec);
            return;
        case DateLocale.British:
            applyLocale('en-gb', spec);
            return;
        case DateLocale.German:
            applyLocale('de', spec);
            return;
        default:
            expectNever(locale);
            return;
    }
};

const weekDayToMoment = (s: WeekDay): number => {
    switch (s) {
        case WeekDay.Sunday:
            return 0;
        case WeekDay.Monday:
            return 1;
        case WeekDay.Tuesday:
            return 2;
        case WeekDay.Wednesday:
            return 3;
        case WeekDay.Thursday:
            return 4;
        case WeekDay.Friday:
            return 5;
        case WeekDay.Saturday:
            return 6;
        default:
            return expectNever(s);
    }
};

export const BootUserSettings: React.FC<React.PropsWithChildren> = ({children}): React.ReactElement => {
    const {done, firstDayOfTheWeek, dateLocale} = useSettings();

    // The locale has to be set before the children are rendered, otherwise their first render uses the old locale.
    React.useMemo(() => {
        if (!done) {
            return;
        }
        setLocale(dateLocale, {
            week: {
                dow: weekDayToMoment(firstDayOfTheWeek),
                doy: moment.localeData(moment.locale()).firstDayOfYear(),
            },
        });
    }, [dateLocale, firstDayOfTheWeek, done]);

    if (!done) {
        return <CenteredSpinner />;
    }

    return <>{children}</>;
};
