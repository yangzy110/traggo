import * as React from 'react';
import moment from 'moment';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import {useApolloClient} from '@apollo/client/react';
import {useSnackbar} from 'notistack';
import {ExportCsvButton} from '../common/ExportCsvButton';
import {useCurrentUserName} from '../gql/useCurrentUserName';
import {DAY_FORMAT, exportLog, LogEntry, MAX_STATS_DAYS, memberFileName, validateRange} from './team/teamutils';
import {fetchAllTimeSpans} from './fetchTimeSpans';

const defaultFrom = () => moment().subtract(6, 'day').format(DAY_FORMAT);
const defaultTo = () => moment().format(DAY_FORMAT);

// "Export CSV" of the own log: the user chooses the days (by default the last week).
export const ExportRangeButton: React.FC = () => {
    const client = useApolloClient();
    const {enqueueSnackbar} = useSnackbar();
    const username = useCurrentUserName();
    const [open, setOpen] = React.useState(false);
    const [from, setFrom] = React.useState(defaultFrom);
    const [to, setTo] = React.useState(defaultTo);
    const [busy, setBusy] = React.useState(false);
    const error = validateRange(from, to, MAX_STATS_DAYS);

    const exportRange = async () => {
        setBusy(true);
        try {
            const start = moment(from, DAY_FORMAT).startOf('day').format();
            const end = moment(to, DAY_FORMAT).endOf('day').format();
            const items = await fetchAllTimeSpans(client, start, end);
            if (items.length === 0) {
                enqueueSnackbar('这段时间内没有记录可导出', {variant: 'info'});
                return;
            }
            const entries: LogEntry[] = items
                .map((ts) => ({member: username, start: ts.start, end: ts.end, tags: ts.tags, note: ts.note}))
                .sort((a, b) => moment(a.start).diff(moment(b.start)));
            exportLog(memberFileName(username, from, to), entries);
            setOpen(false);
        } catch (e) {
            enqueueSnackbar('导出失败: ' + (e instanceof Error ? e.message : String(e)), {variant: 'error'});
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <ExportCsvButton
                onClick={() => {
                    setFrom(defaultFrom());
                    setTo(defaultTo());
                    setOpen(true);
                }}
            />
            <Dialog open={open} onClose={() => !busy && setOpen(false)} fullWidth maxWidth="xs">
                <DialogTitle>导出 CSV</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{marginBottom: 2}}>
                        选择要导出的日期（包含开始和结束那一天）。
                    </Typography>
                    <Box sx={{display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap'}}>
                        <TextField
                            type="date"
                            label="从"
                            value={from}
                            onChange={(e) => setFrom(e.target.value)}
                            slotProps={{inputLabel: {shrink: true}}}
                        />
                        <span>—</span>
                        <TextField
                            type="date"
                            label="到"
                            value={to}
                            onChange={(e) => setTo(e.target.value)}
                            slotProps={{inputLabel: {shrink: true}}}
                        />
                    </Box>
                    {error ? (
                        <Typography color="error" variant="body2" sx={{marginTop: 1.5}}>
                            {error}
                        </Typography>
                    ) : null}
                </DialogContent>
                <DialogActions>
                    <Button disabled={busy} onClick={() => setOpen(false)}>
                        取消
                    </Button>
                    <Button variant="contained" disabled={busy || !!error} onClick={exportRange}>
                        导出
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};
