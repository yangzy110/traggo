import Paper from '@mui/material/Paper';
import * as React from 'react';
import type {SxProps, Theme as MuiTheme} from '@mui/material/styles';
import {gutters} from './styles';

const rootSx: SxProps<MuiTheme> = (theme) => ({
    ...gutters(theme),
    paddingTop: theme.spacing(4),
    paddingBottom: theme.spacing(3),
    textAlign: 'center',
    maxWidth: 400,
    borderTop: `5px solid ${theme.palette.primary.main}`,
});
export const DefaultPaper: React.FC<React.PropsWithChildren> = ({children}) => {
    return (
        <Paper elevation={10} square={true} sx={rootSx}>
            {children}
        </Paper>
    );
};
