import * as React from 'react';
import {FormControlLabel, FormHelperText, Paper, Switch, TextField} from '@mui/material';
import {SetSettings as SetSettingsGQL, Settings as SettingsGQL, useSettings} from '../gql/settings';
import {useMutation, useQuery} from '@apollo/client/react';
import * as gqlTag from '../gql/tags';
import {sortTags} from '../tag/defaultTag';
import {SetSettings, SetSettingsVariables, DateLocale, Theme, Tags} from '../gql/types';
import {useSnackbar} from 'notistack';
import {handleError} from '../utils/errors';
import type {SxProps, Theme as MuiTheme} from '@mui/material/styles';
import {gutters} from '../common/styles';
import {dateLocaleLabels, label, themeLabels} from '../common/labels';
import {setFollowSystemTheme, useFollowSystemTheme} from '../provider/followSystemTheme';

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
    const followSystem = useFollowSystemTheme();
    const tagsResult = useQuery<Tags>(gqlTag.Tags);
    const usableTags = sortTags(((tagsResult.data && tagsResult.data.tags) || []).filter((tag) => !tag.archived));
    const [setSettings] = useMutation<SetSettings, SetSettingsVariables>(SetSettingsGQL, {
        refetchQueries: [{query: SettingsGQL}],
    });
    // without a chosen default tag the first tag is used, so it is shown as the selected one
    const chosenDefaultTag = usableTags.find((tag) => tag.key === settings.defaultTag);
    const shownDefaultTag = chosenDefaultTag ? chosenDefaultTag.key : usableTags.length > 0 ? usableTags[0].key : '';
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
                label="默认标签"
                margin="normal"
                fullWidth
                helperText="新建记录时会自动选中这个标签。还没有设置过时，默认是第一个标签。"
                slotProps={{select: {native: true}}}
                disabled={usableTags.length === 0}
                value={shownDefaultTag}
                onChange={(e) => {
                    setSettings({variables: {settings: {...settings, defaultTag: e.target.value}}})
                        .then(() => enqueueSnackbar('默认标签已更改', {variant: 'success'}))
                        .catch(handleError('更改默认标签失败', enqueueSnackbar));
                }}>
                {usableTags.length === 0 ? <option value="">暂无标签</option> : null}
                {usableTags.map((tag) => (
                    <option key={tag.key} value={tag.key}>
                        {tag.key}
                    </option>
                ))}
            </TextField>
            <FormControlLabel
                control={<Switch checked={followSystem} onChange={(e) => setFollowSystemTheme(e.target.checked)} />}
                label="跟随系统外观（自动切换深色/浅色）"
                sx={{display: 'flex', marginTop: 1}}
            />
            <FormHelperText sx={{marginTop: 0, marginBottom: 1}}>
                打开时，主题会跟随 macOS / Windows 的外观设置，系统自动切换深浅色时这里也会同步。关闭后使用下面选择的主题。
            </FormHelperText>
            <TextField
                select
                label="主题"
                margin="normal"
                fullWidth
                disabled={followSystem}
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
