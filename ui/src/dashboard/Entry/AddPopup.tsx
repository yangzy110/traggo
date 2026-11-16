import * as React from 'react';
import Popper from '@mui/material/Popper';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import {Paper} from '@mui/material';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import {Dashboards_dashboards_items, AddDashboardEntry, AddDashboardEntryVariables} from '../../gql/types';
import {useMutation} from '@apollo/client/react';
import * as gqlDashboard from '../../gql/dashboard';
import {Fade} from '../../common/Fade';
import {DashboardEntryForm, isValidDashboardEntry} from './DashboardEntryForm';
import {handleError} from '../../utils/errors';
import {useSnackbar} from 'notistack';
import {stripTypename} from '../../utils/strip';

interface EditPopupProps {
    dashboardId: number;
    entry: Dashboards_dashboards_items;
    anchorEl: HTMLElement;
    onChange: (entry: Dashboards_dashboards_items | null) => void;
    doPreview: (preview: boolean) => void;
    preview: boolean;
    maxY: number;
    finish: () => void;
    ranges: Record<number, string>;
}

export const AddPopup: React.FC<EditPopupProps> = ({
    entry,
    maxY,
    anchorEl,
    onChange: setEdit,
    doPreview,
    preview,
    dashboardId,
    finish,
    ranges,
}) => {
    const [addEntry] = useMutation<AddDashboardEntry, AddDashboardEntryVariables>(gqlDashboard.AddDashboardEntry, {
        refetchQueries: [{query: gqlDashboard.Dashboards}],
    });
    const valid = isValidDashboardEntry(entry);

    const {enqueueSnackbar} = useSnackbar();

    return (
        <Popper
            key="popup"
            open={true}
            anchorEl={anchorEl}
            placement={'right-end'}
            disablePortal={false}
            style={{zIndex: 99999}}
            keepMounted={true}>
            <Fade fullyVisible={!preview} opacity={0.4}>
                <ClickAwayListener onClickAway={() => setEdit(null)}>
                    <Paper style={{padding: 10, maxWidth: 500}}>
                        <Typography variant="h5">添加</Typography>
                        <DashboardEntryForm ranges={ranges} entry={entry} onChange={setEdit} disabled={preview} />
                        <div style={{textAlign: 'right', display: 'flex', justifyContent: 'flex-end', paddingTop: 10}}>
                            <Button
                                color={'primary'}
                                variant={'outlined'}
                                style={{marginRight: 10, flex: 1}}
                                disabled={!valid}
                                onClick={() => doPreview(!preview)}>
                                {preview ? 'Exit Preview' : 'Preview'}
                            </Button>
                            <Button
                                color={'secondary'}
                                variant={'outlined'}
                                style={{marginRight: 10}}
                                onClick={() => setEdit(null)}>
                                取消
                            </Button>
                            <Button
                                color={'primary'}
                                disabled={!valid}
                                variant={'contained'}
                                onClick={() => {
                                    addEntry({
                                        variables: {
                                            dashboardId,
                                            entryType: entry.entryType,
                                            title: entry.title,
                                            total: entry.total,
                                            stats: {
                                                tags: entry.statsSelection.tags,
                                                interval: entry.statsSelection.interval,
                                                range: entry.statsSelection.range
                                                    ? {
                                                          from: entry.statsSelection.range.from,
                                                          to: entry.statsSelection.range.to,
                                                      }
                                                    : null,
                                                rangeId: entry.statsSelection.rangeId,
                                                excludeTags: stripTypename(entry.statsSelection.excludeTags),
                                                includeTags: stripTypename(entry.statsSelection.includeTags),
                                            },
                                            pos: {
                                                desktop: {
                                                    y: maxY,
                                                    x: 0,
                                                    w: 6,
                                                    h: 6,
                                                },
                                            },
                                        },
                                    })
                                        .then(finish)
                                        .catch(handleError('添加条目失败', enqueueSnackbar));
                                }}>
                                添加
                            </Button>
                        </div>
                    </Paper>
                </ClickAwayListener>
            </Fade>
        </Popper>
    );
};
