import './global.css';
import 'react-grid-layout/css/styles.css';
import '@fontsource-variable/inter';
import {ThemeProvider} from './provider/ThemeProvider';
import {ApolloProvider} from './provider/ApolloProvider';
import {SnackbarProvider} from './provider/SnackbarProvider';
import {LocalizationProvider} from '@mui/x-date-pickers/LocalizationProvider';
import {AdapterMoment} from '@mui/x-date-pickers/AdapterMoment';
import {zhCN} from '@mui/x-date-pickers/locales';
import {Router} from './Router';
import {HashRouter} from 'react-router-dom';
import {BootUserSettings} from './provider/UserSettingsProvider';

export const Root = () => {
    return (
        <ApolloProvider>
            <BootUserSettings>
                <ThemeProvider>
                    <LocalizationProvider
                        dateAdapter={AdapterMoment}
                        localeText={zhCN.components.MuiLocalizationProvider.defaultProps.localeText}>
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
