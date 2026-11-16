import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import * as React from 'react';

export const CenteredSpinner = () => (
    <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'center', height: '95%'}}>
        <CircularProgress size={100} />
    </Box>
);
