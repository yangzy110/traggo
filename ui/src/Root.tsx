import * as React from 'react';
import './global.css';
import 'react-grid-layout/css/styles.css';
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import {ThemeProvider} from './provider/ThemeProvider';
import {ApolloProvider} from './provider/ApolloProvider';
import {SnackbarProvider} from './provider/SnackbarProvider';
import {LocalizationProvider} from '@mui/x-date-pickers/LocalizationProvider';
import {AdapterMoment} from '@mui/x-date-pickers/AdapterMoment';
import {Router} from './Router';
import {HashRouter} from 'react-router-dom';
import {BootUserSettings} from './provider/UserSettingsProvider';

export const Root = () => {
    return (
        <ApolloProvider>
            <BootUserSettings>
                <ThemeProvider>
                    <LocalizationProvider dateAdapter={AdapterMoment}>
                        <SnackbarProvider>
                            <HashRouter>
                                <Router />
                            </HashRouter>
                        </SnackbarProvider>
                    </LocalizationProvider>
                </ThemeProvider>
            </BootUserSettings>
        </ApolloProvider>
    );
};
