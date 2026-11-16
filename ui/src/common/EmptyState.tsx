import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

// A hint with an icon for pages without any content.
export const EmptyState: React.FC<{icon: React.ReactNode; title: string; hint?: string; action?: React.ReactNode}> = ({
    icon,
    title,
    hint,
    action,
}) => (
    <Box sx={{textAlign: 'center', marginTop: 8, color: 'text.secondary'}}>
        <Box
            sx={(theme) => ({
                display: 'inline-flex',
                padding: 2,
                borderRadius: '50%',
                background: theme.palette.action.hover,
                '& svg': {fontSize: 36},
            })}>
            {icon}
        </Box>
        <Typography variant="subtitle1" color="text.primary" sx={{marginTop: 1.5, fontWeight: 600}}>
            {title}
        </Typography>
        {hint ? <Typography variant="body2">{hint}</Typography> : null}
        {action ? <Box sx={{marginTop: 2}}>{action}</Box> : null}
    </Box>
);
