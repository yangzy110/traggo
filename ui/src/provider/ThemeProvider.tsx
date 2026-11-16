import * as React from 'react';
import {createTheme, ThemeProvider as MuiThemeProvider, type Theme} from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import {useSettings} from '../gql/settings';
import {Theme as SettingTheme} from '../gql/types';

const themes: Record<SettingTheme, Theme> = {
    [SettingTheme.GruvboxDark]: createTheme({
        components: {
            MuiLink: {
                styleOverrides: {
                    root: {
                        color: '#458588',
                    },
                },
            },
            MuiIconButton: {
                styleOverrides: {
                    root: {
                        color: 'inherit',
                    },
                },
            },
            MuiListItemIcon: {
                styleOverrides: {
                    root: {
                        color: 'inherit',
                    },
                },
            },
            MuiToolbar: {
                styleOverrides: {
                    root: {
                        background: '#a89984',
                    },
                },
            },
        },
        palette: {
            background: {
                default: '#282828',
                paper: '#32302f',
            },
            text: {
                primary: '#fbf1d4',
            },
            primary: {
                main: '#a89984',
            },
            secondary: {
                main: '#f44336',
            },
            mode: 'dark',
        },
    }),
    [SettingTheme.GruvboxLight]: createTheme({
        components: {
            MuiLink: {
                styleOverrides: {
                    root: {
                        color: '#458588',
                    },
                },
            },
            MuiIconButton: {
                styleOverrides: {
                    root: {
                        color: 'inherit',
                    },
                },
            },
            MuiListItemIcon: {
                styleOverrides: {
                    root: {
                        color: 'inherit',
                    },
                },
            },
            MuiToolbar: {
                styleOverrides: {
                    root: {
                        background: '#7c6f64',
                    },
                },
            },
        },
        palette: {
            background: {
                default: '#fbf1c7',
                paper: '#f9f5d7',
            },
            text: {
                primary: '#282828',
            },
            primary: {
                main: '#7c6f64',
            },
            secondary: {
                main: '#f44336',
            },
            mode: 'light',
        },
    }),
    [SettingTheme.MaterialLight]: createTheme({
        components: {
            MuiLink: {
                styleOverrides: {
                    root: {
                        color: '#2980b9',
                    },
                },
            },
            MuiIconButton: {
                styleOverrides: {
                    root: {
                        color: 'inherit',
                    },
                },
            },
        },
        palette: {
            background: {default: '#eeeeee'},
            primary: {
                main: '#455a64',
            },
            secondary: {
                main: '#f44336',
            },
            mode: 'light',
        },
    }),
    [SettingTheme.MaterialDark]: createTheme({
        components: {
            MuiLink: {
                styleOverrides: {
                    root: {
                        color: '#3498db',
                    },
                },
            },
        },
        palette: {
            primary: {
                main: '#455a64',
            },
            secondary: {
                main: '#f44336',
            },
            mode: 'dark',
        },
    }),
};

export const ThemeProvider: React.FC<React.PropsWithChildren> = ({children}) => {
    const {theme} = useSettings();
    return (
        <MuiThemeProvider theme={themes[theme] || themes[SettingTheme.GruvboxDark]}>
            <CssBaseline />
            {children}
        </MuiThemeProvider>
    );
};
