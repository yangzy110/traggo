import * as React from 'react';
import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import {statsStyles as styles} from './statsStyles';

export const SummaryCard: React.FC<{label: string; value: string}> = ({label, value}) => (
    <Paper sx={{flex: '1 1 160px', padding: 2}}>
        <Typography variant="body2" color="text.secondary">
            {label}
        </Typography>
        <Typography variant="h5" sx={{marginTop: 0.5, fontVariantNumeric: 'tabular-nums'}}>
            {value}
        </Typography>
    </Paper>
);

// One bar which shows how the total is divided, the smallest parts are summed up.
export const StackedBar: React.FC<{parts: Array<{label: string; seconds: number; color: string}>}> = ({parts}) => {
    const total = parts.reduce((sum, part) => sum + part.seconds, 0);
    if (total <= 0) {
        return null;
    }
    const sorted = [...parts].sort((a, b) => b.seconds - a.seconds);
    const shown = sorted.slice(0, 8);
    const rest = sorted.slice(8).reduce((sum, part) => sum + part.seconds, 0);
    const all = rest > 0 ? [...shown, {label: '其他', seconds: rest, color: '#9aa0a6'}] : shown;
    return (
        <Box sx={{display: 'flex', height: 12, borderRadius: 6, overflow: 'hidden', gap: '2px', marginBottom: 1.5}}>
            {all.map((part) => (
                <Box
                    key={part.label}
                    title={`${part.label} ${((part.seconds / total) * 100).toFixed(1)}%`}
                    sx={{flex: part.seconds, background: part.color, minWidth: 3}}
                />
            ))}
        </Box>
    );
};

export const ShareBar: React.FC<{share: number}> = ({share}) => (
    <Box sx={styles.share}>
        <LinearProgress sx={styles.shareBar} variant="determinate" value={Math.min(100, share * 100)} />
        <Box component="span" sx={styles.shareText}>
            {(share * 100).toFixed(1)}%
        </Box>
    </Box>
);
