import * as React from 'react';
import moment from 'moment';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import {parseTime, TIME_TEXT_FORMAT, WorkRow} from './importcsv';

const PAGE = 40;

// Long lists are shown in parts.
export const Paged: React.FC<{items: React.ReactNode[]}> = ({items}) => {
    const [shown, setShown] = React.useState(PAGE);
    return (
        <>
            {items.slice(0, shown)}
            {items.length > shown ? (
                <Button fullWidth onClick={() => setShown(shown + PAGE)}>
                    显示更多（还有 {items.length - shown} 行）
                </Button>
            ) : null}
        </>
    );
};

export const timeLabel = (iso: string) => moment(iso).format('YYYY-MM-DD HH:mm');

export const Row: React.FC<React.PropsWithChildren<{title: string}>> = ({title, children}) => (
    <Paper variant="outlined" sx={{padding: 1.5, marginBottom: 1.5}}>
        <Typography variant="subtitle2" sx={{marginBottom: 0.5}}>
            {title}
        </Typography>
        {children}
    </Paper>
);

export const Bulk: React.FC<React.PropsWithChildren<{hint: string}>> = ({hint, children}) => (
    <Alert severity="info" icon={false} sx={{marginBottom: 1.5, alignItems: 'center'}}>
        <Box sx={{display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center'}}>
            <Typography variant="body2" sx={{marginRight: 1}}>
                {hint}
            </Typography>
            {children}
        </Box>
    </Alert>
);

export const Summary: React.FC<{row: WorkRow}> = ({row}) => (
    <Typography variant="body2" color="text.secondary">
        {row.note || '（无内容）'}
        {row.tags.length ? ` [${row.tags.join('; ')}]` : ''}
    </Typography>
);

// The two times of a row can be changed.
export const TimeFields: React.FC<{row: WorkRow; onChange: (patch: Partial<WorkRow>) => void}> = ({row, onChange}) => (
    <Box sx={{display: 'flex', gap: 1, flexWrap: 'wrap', marginTop: 1}}>
        {(['start', 'end'] as const).map((field) => (
            <TextField
                key={field}
                size="small"
                label={field === 'start' ? '开始' : '结束'}
                value={row[field]}
                error={!parseTime(row[field])}
                onChange={(e) => onChange({[field]: e.target.value, durationAccepted: false})}
                placeholder={TIME_TEXT_FORMAT}
                sx={{width: 210}}
            />
        ))}
    </Box>
);

export interface PanelProps {
    rows: WorkRow[];
    onChangeRow: (line: number, patch: Partial<WorkRow>) => void;
}
