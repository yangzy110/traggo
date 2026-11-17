import * as React from 'react';
import {Paper, TextField} from '@mui/material';
import {SetSettings as SetSettingsGQL, Settings as SettingsGQL, useSettings} from '../gql/settings';
import {useMutation} from '@apollo/client/react';
import {SetSettings, SetSettingsVariables, DateLocale, Theme} from '../gql/types';
import {useSnackbar} from 'notistack';
import {handleError} from '../utils/errors';
import type {SxProps, Theme as MuiTheme} from '@mui/material/styles';
import {gutters} from '../common/styles';
import {dateLocaleLabels, label, themeLabels} from '../common/labels';

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
            <TextField
                select
                label="日期格式"
                margin="normal"
                fullWidth
                slotProps={{select: {native: true}}}
                // only Chinese and English are offered, the other formats which were chosen in the past are shown as English
                value={settings.dateLocale === DateLocale.Chinese ? DateLocale.Chinese : DateLocale.American}
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
                            enqueueSnackbar('日期格式已更改', {
                                variant: 'success',
                            });
                            enqueueSnackbar('请刷新页面以使新的日期格式完全生效', {
                                variant: 'info',
                                preventDuplicate: true,
                                persist: true,
                            });
                        })
                        .catch(handleError('更改日期格式失败', enqueueSnackbar));
                }}>
                {[DateLocale.Chinese, DateLocale.American].map((type) => (
                    <option key={type} value={type}>
                        {label(dateLocaleLabels, type)}
                    </option>
                ))}
            </TextField>
            <TextField
                select
                label="主题"
                margin="normal"
                fullWidth
                slotProps={{select: {native: true}}}
                value={
                    settings.theme === Theme.GruvboxDark
                        ? Theme.MaterialDark
                        : settings.theme === Theme.GruvboxLight
                          ? Theme.MaterialLight
                          : settings.theme
                }
                onChange={(e) => {
                    setSettings({variables: {settings: {...settings, theme: e.target.value as Theme}}})
                        .then(() =>
                            enqueueSnackbar('主题已更改', {
                                variant: 'success',
                            })
                        )
                        .catch(handleError('更改主题失败', enqueueSnackbar));
                }}>
                {[Theme.MaterialLight, Theme.MaterialDark].map((type) => (
                    <option key={type} value={type}>
                        {label(themeLabels, type)}
                    </option>
                ))}
            </TextField>
        </Paper>
    );
};
