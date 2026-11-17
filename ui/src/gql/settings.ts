import {gql} from '@apollo/client';
import {useQuery} from '@apollo/client/react';
import {Settings as SettingsQueryResponse, DateLocale, Theme, WeekDay, DateTimeInputStyle} from './types';
import {stripTypename} from '../utils/strip';

export const Settings = gql`
    query Settings {
        userSettings {
            theme
            dateLocale
            firstDayOfTheWeek
            dateTimeInputStyle
            defaultTag
        }
    }
`;

export const SetSettings = gql`
    mutation SetSettings($settings: InputUserSettings!) {
        setUserSettings(settings: $settings) {
            theme
            dateTimeInputStyle
            defaultTag
        }
    }
`;

const defaultSettings = {
    theme: Theme.MaterialLight,
    dateLocale: DateLocale.Chinese,
    firstDayOfTheWeek: WeekDay.Monday,
    dateTimeInputStyle: DateTimeInputStyle.Fancy,
    defaultTag: '',
} as const;

export const useSettings = (): {done: boolean} & Omit<SettingsQueryResponse['userSettings'], '__typename'> => {
    const data = useQuery<SettingsQueryResponse>(Settings);

    if (data.loading || data.error || !data.data) {
        return {...defaultSettings, done: false};
    }
    // the first day of the week and the input style of dates are not chosen by the user
    return {
        ...stripTypename(data.data.userSettings),
        firstDayOfTheWeek: defaultSettings.firstDayOfTheWeek,
        dateTimeInputStyle: defaultSettings.dateTimeInputStyle,
        done: true,
    };
};
