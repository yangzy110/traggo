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

const light = createTheme(
    options(common(false), plainAppBar(), {
        palette: {
            mode: 'light',
            background: {default: '#f6f6f8', paper: '#ffffff'},
            text: {primary: '#16181d', secondary: '#5d6472'},
            divider: '#e6e7eb',
            primary: {main: '#4f46e5', light: '#818cf8', dark: '#4338ca', contrastText: '#ffffff'},
            secondary: {main: '#e5484d'},
        },
    })
);

const dark = createTheme(
    options(common(true), plainAppBar(), {
        palette: {
            mode: 'dark',
            background: {default: '#0f1013', paper: '#17181c'},
            text: {primary: '#ececf1', secondary: '#9a9fab'},
            divider: '#272a31',
            primary: {main: '#8b93f8', light: '#a5b4fc', dark: '#6366f1', contrastText: '#0b0c10'},
            secondary: {main: '#f87171'},
        },
    })
);

// The former gruvbox themes of existing users are shown as the light and the dark theme.
const isDark = (theme: SettingTheme) => theme === SettingTheme.MaterialDark || theme === SettingTheme.GruvboxDark;

export const ThemeProvider: React.FC<React.PropsWithChildren> = ({children}) => {
    const {theme} = useSettings();
    return (
        <MuiThemeProvider theme={isDark(theme) ? dark : light}>
            <CssBaseline />
            {children}
        </MuiThemeProvider>
    );
};
