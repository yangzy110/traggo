import * as React from 'react';
import {MaterialDesignContent, SnackbarProvider as Provider} from 'notistack';
import {styled} from '@mui/material/styles';

// notistack adds the class `notistack-MuiContent-<variant>` to the content of a snackbar.
const Content = styled(MaterialDesignContent)({
    '&.notistack-MuiContent-error': {
        background: '#E53935',
        color: '#fff',
    },
    '&.notistack-MuiContent-warning': {
        background: '#d35400',
        color: '#fff',
    },
    '&.notistack-MuiContent-info': {
        background: '#2980b9',
        color: '#fff',
    },
});

export const SnackbarProvider: React.FC<React.PropsWithChildren> = ({children}) => {
    return (
        <Provider maxSnack={3} Components={{error: Content, warning: Content, info: Content}} autoHideDuration={3500}>
            {children}
        </Provider>
    );
};
