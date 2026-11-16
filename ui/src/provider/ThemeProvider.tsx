import * as React from 'react';
import {alpha, createTheme, ThemeProvider as MuiThemeProvider, type Theme, type ThemeOptions} from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import {useSettings} from '../gql/settings';
import {Theme as SettingTheme} from '../gql/types';

// Inter has no chinese characters, the system fonts are used for them.
const fontFamily = [
    '"Inter Variable"',
    'Inter',
    '-apple-system',
    'BlinkMacSystemFont',
    '"Segoe UI"',
    'Roboto',
    '"Noto Sans SC"',
    '"PingFang SC"',
    '"Hiragino Sans GB"',
    '"Microsoft YaHei"',
    'sans-serif',
].join(',');

// Very soft shadows, the border does most of the work.
const softShadows = (dark: boolean): Theme['shadows'] => {
    const color = dark ? '0,0,0' : '15,23,42';
    const shadows = ['none'];
    for (let i = 1; i <= 24; i++) {
        shadows.push(`0 ${Math.ceil(i / 2)}px ${i + 2}px rgba(${color},${(dark ? 0.25 : 0.04) + i * 0.003})`);
    }
    return shadows as unknown as Theme['shadows'];
};

// Shared by all themes: rounded shapes, calm typography and flat controls.
const common = (dark: boolean): ThemeOptions => ({
    shape: {borderRadius: 10},
    shadows: softShadows(dark),
    typography: {
        fontFamily,
        h1: {fontWeight: 700, letterSpacing: '-0.02em'},
        h2: {fontWeight: 700, letterSpacing: '-0.02em'},
        h3: {fontWeight: 700, letterSpacing: '-0.015em'},
        h4: {fontWeight: 700, letterSpacing: '-0.01em'},
        h5: {fontWeight: 600, letterSpacing: '-0.01em'},
        h6: {fontWeight: 600, letterSpacing: '-0.005em'},
        subtitle1: {fontWeight: 500},
        subtitle2: {fontWeight: 600},
        button: {textTransform: 'none', fontWeight: 600, letterSpacing: 0},
    },
    components: {
        MuiCssBaseline: {
            styleOverrides: {
                body: {WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale'},
            },
        },
        MuiButton: {
            defaultProps: {disableElevation: true},
            styleOverrides: {
                root: {borderRadius: 8, paddingLeft: 14, paddingRight: 14},
                sizeLarge: {paddingTop: 10, paddingBottom: 10},
            },
        },
        MuiIconButton: {styleOverrides: {root: {borderRadius: 8}}},
        MuiPaper: {
            styleOverrides: {
                root: ({theme}) => ({
                    backgroundImage: 'none',
                    // the cards are flat: a border and not a shadow
                    '&.MuiPaper-elevation0, &.MuiPaper-elevation1': {
                        border: `1px solid ${theme.palette.divider}`,
                        boxShadow: 'none',
                    },
                }),
                rounded: {borderRadius: 12},
            },
        },
        MuiDialog: {styleOverrides: {paper: {borderRadius: 16}}},
        MuiMenu: {
            styleOverrides: {
                paper: ({theme}) => ({
                    borderRadius: 12,
                    marginTop: 4,
                    border: `1px solid ${theme.palette.divider}`,
                }),
                list: {padding: 6},
            },
        },
        MuiPopover: {styleOverrides: {paper: {borderRadius: 12}}},
        MuiMenuItem: {styleOverrides: {root: {borderRadius: 8, minHeight: 36}}},
        MuiListItemButton: {styleOverrides: {root: {borderRadius: 8}}},
        MuiTextField: {defaultProps: {size: 'small'}},
        MuiOutlinedInput: {styleOverrides: {root: {borderRadius: 8}}},
        MuiNativeSelect: {defaultProps: {variant: 'outlined'}},
        MuiChip: {styleOverrides: {root: {borderRadius: 8, fontWeight: 500}}},
        MuiTooltip: {
            styleOverrides: {
                tooltip: {borderRadius: 8, fontSize: '0.8rem', padding: '6px 10px'},
            },
        },
        MuiLinearProgress: {styleOverrides: {root: {height: 8, borderRadius: 4}}},
        MuiTableCell: {
            styleOverrides: {
                root: ({theme}) => ({borderBottom: `1px solid ${theme.palette.divider}`}),
                head: ({theme}) => ({fontWeight: 600, color: theme.palette.text.secondary}),
            },
        },
        MuiTableRow: {
            styleOverrides: {
                root: {'&:last-child td, &:last-child th': {borderBottom: 0}},
            },
        },
        MuiLink: {defaultProps: {underline: 'hover'}},
    },
});

// A clean app bar which is not colored: the content below can be seen through it a bit.
const plainAppBar = (): ThemeOptions => ({
    components: {
        MuiAppBar: {
            defaultProps: {elevation: 0},
            styleOverrides: {
                root: ({theme}) => ({
                    backgroundColor: alpha(theme.palette.background.paper, 0.85),
                    color: theme.palette.text.primary,
                    backgroundImage: 'none',
                    backdropFilter: 'saturate(180%) blur(12px)',
                    borderBottom: `1px solid ${theme.palette.divider}`,
                }),
            },
        },
        MuiToolbar: {styleOverrides: {root: {background: 'transparent'}}},
    },
});

const gruvbox = (dark: boolean): ThemeOptions => ({
    components: {
        MuiLink: {styleOverrides: {root: {color: '#458588'}}},
        MuiIconButton: {styleOverrides: {root: {color: 'inherit'}}},
        MuiListItemIcon: {styleOverrides: {root: {color: 'inherit'}}},
        MuiToolbar: {styleOverrides: {root: {background: dark ? '#a89984' : '#7c6f64'}}},
        MuiAppBar: {defaultProps: {elevation: 0}},
    },
    palette: dark
        ? {
              mode: 'dark',
              background: {default: '#282828', paper: '#32302f'},
              text: {primary: '#fbf1d4', secondary: '#bdae93'},
              primary: {main: '#a89984'},
              secondary: {main: '#f44336'},
          }
        : {
              mode: 'light',
              background: {default: '#fbf1c7', paper: '#f9f5d7'},
              text: {primary: '#282828', secondary: '#665c54'},
              primary: {main: '#7c6f64'},
              secondary: {main: '#f44336'},
          },
});

type PlainObject = Record<string, unknown>;

const isPlainObject = (value: unknown): value is PlainObject =>
    !!value && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;

const mergeObjects = (target: PlainObject, source: PlainObject): PlainObject => {
    const result: PlainObject = {...target};
    Object.entries(source).forEach(([key, value]) => {
        const existing = result[key];
        result[key] = isPlainObject(existing) && isPlainObject(value) ? mergeObjects(existing, value) : value;
    });
    return result;
};

// The options have to be merged before the theme is created: createTheme(a, b) creates the palette (f.ex. the colors of
// the dark mode) only from `a`, the later arguments are merged into the finished theme.
const options = (...all: ThemeOptions[]): ThemeOptions =>
    all.reduce<PlainObject>((a, b) => mergeObjects(a, b as PlainObject), {});

const themes: Record<SettingTheme, Theme> = {
    [SettingTheme.GruvboxDark]: createTheme(options(common(true), gruvbox(true))),
    [SettingTheme.GruvboxLight]: createTheme(options(common(false), gruvbox(false))),
    [SettingTheme.MaterialLight]: createTheme(
        options(common(false), plainAppBar(), {
            palette: {
                mode: 'light',
                background: {default: '#f6f8fb', paper: '#ffffff'},
                text: {primary: '#0f172a', secondary: '#526077'},
                divider: '#e3e8ef',
                primary: {main: '#2563eb', light: '#60a5fa', dark: '#1d4ed8', contrastText: '#ffffff'},
                secondary: {main: '#e5484d'},
            },
        })
    ),
    [SettingTheme.MaterialDark]: createTheme(
        options(common(true), plainAppBar(), {
            palette: {
                mode: 'dark',
                background: {default: '#0b1120', paper: '#111a2e'},
                text: {primary: '#e6edf7', secondary: '#9aa8bd'},
                divider: '#1f2b44',
                primary: {main: '#60a5fa', light: '#93c5fd', dark: '#3b82f6', contrastText: '#06101f'},
                secondary: {main: '#f87171'},
            },
        })
    ),
};

export const ThemeProvider: React.FC<React.PropsWithChildren> = ({children}) => {
    const {theme} = useSettings();
    return (
        <MuiThemeProvider theme={themes[theme] || themes[SettingTheme.MaterialLight]}>
            <CssBaseline />
            {children}
        </MuiThemeProvider>
    );
};
