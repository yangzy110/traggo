import * as React from 'react';
import {Paper} from '@mui/material';
import {SetSettings as SetSettingsGQL, Settings as SettingsGQL, useSettings} from '../gql/settings';
import {useMutation} from '@apollo/client/react';
import {SetSettings, SetSettingsVariables, DateLocale, Theme, WeekDay, DateTimeInputStyle} from '../gql/types';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/NativeSelect';
import {useSnackbar} from 'notistack';
import {handleError} from '../utils/errors';
import type {SxProps, Theme as MuiTheme} from '@mui/material/styles';
import {gutters} from '../common/styles';

const rootSx: SxProps<MuiTheme> = (theme) => ({
    ...gutters(theme),
    paddingTop: theme.spacing(1),
    paddingBottom: theme.spacing(3),
    maxWidth: 500,
    margin: '0 auto',
});

export const SettingsPage: React.FC = () => {
    const {done, ...settings} = useSettings();
    const {enqueueSnackbar} = useSnackbar();
    const [setSettings] = useMutation<SetSettings, SetSettingsVariables>(SetSettingsGQL, {
        refetchQueries: [{query: SettingsGQL}],
    });
    return (
        <Paper elevation={1} sx={rootSx}>
            <FormControl variant="standard" margin={'normal'} fullWidth>
                <InputLabel>Date Locale</InputLabel>
                <Select
                    variant="standard"
                    fullWidth
                    value={settings.dateLocale}
                    onChange={(e) => {
                        setSettings({
                            variables: {
                                settings: {
                                    ...settings,
                                    dateLocale: e.target.value as DateLocale,
                                },
                            },
                        })
                            .then(() => {
                                enqueueSnackbar('date locale changed', {
                                    variant: 'success',
                                });
                                enqueueSnackbar('a reload of the page is required for the new date locale to fully function', {
                                    variant: 'info',
                                    preventDuplicate: true,
                                    persist: true,
                                });
                            })
                            .catch(handleError('set date locale', enqueueSnackbar));
                    }}>
                    {Object.values(DateLocale).map((type) => (
                        <option key={type} value={type}>
                            {type}
                        </option>
                    ))}
                </Select>
            </FormControl>
            <FormControl variant="standard" margin={'normal'} fullWidth>
                <InputLabel>Theme</InputLabel>
                <Select
                    variant="standard"
                    fullWidth
                    value={settings.theme}
                    onChange={(e) => {
                        setSettings({variables: {settings: {...settings, theme: e.target.value as Theme}}})
                            .then(() =>
                                enqueueSnackbar('theme changed', {
                                    variant: 'success',
                                })
                            )
                            .catch(handleError('set theme', enqueueSnackbar));
                    }}>
                    {Object.values(Theme).map((type) => (
                        <option key={type} value={type}>
                            {type}
                        </option>
                    ))}
                </Select>
            </FormControl>
            <FormControl variant="standard" margin={'normal'} fullWidth>
                <InputLabel>First day of the week</InputLabel>
                <Select
                    variant="standard"
                    fullWidth
                    value={settings.firstDayOfTheWeek}
                    onChange={(e) => {
                        setSettings({
                            variables: {
                                settings: {
                                    ...settings,
                                    firstDayOfTheWeek: e.target.value as WeekDay,
                                },
                            },
                        })
                            .then(() =>
                                enqueueSnackbar('first day of the week changed', {
                                    variant: 'success',
                                })
                            )
                            .catch(handleError('set first day of the week', enqueueSnackbar));
                    }}>
                    {[
                        WeekDay.Sunday,
                        WeekDay.Monday,
                        WeekDay.Tuesday,
                        WeekDay.Wednesday,
                        WeekDay.Thursday,
                        WeekDay.Friday,
                        WeekDay.Saturday,
                    ].map((type) => (
                        <option key={type} value={type}>
                            {type}
                        </option>
                    ))}
                </Select>
            </FormControl>
            <FormControl variant="standard" margin={'normal'} fullWidth>
                <InputLabel>Datetime input style</InputLabel>
                <Select
                    variant="standard"
                    fullWidth
                    value={settings.dateTimeInputStyle}
                    onChange={(e) => {
                        setSettings({
                            variables: {
                                settings: {
                                    ...settings,
                                    dateTimeInputStyle: e.target.value as DateTimeInputStyle,
                                },
                            },
                        })
                            .then(() =>
                                enqueueSnackbar('datetime input style changed', {
                                    variant: 'success',
                                })
                            )
                            .catch(handleError('set datetime input style', enqueueSnackbar));
                    }}>
                    {[DateTimeInputStyle.Fancy, DateTimeInputStyle.Native].map((type) => (
                        <option key={type} value={type}>
                            {type}
                        </option>
                    ))}
                </Select>
            </FormControl>
        </Paper>
    );
};
