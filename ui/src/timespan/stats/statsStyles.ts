import type {SxProps, Theme as MuiTheme} from '@mui/material/styles';

export const statsStyles = {
    controls: (theme) => ({
        display: 'flex',
        alignItems: 'center',
        marginBottom: theme.spacing(2),
        flexWrap: 'wrap',
    }),
    separator: (theme) => ({
        margin: theme.spacing(0, 1),
    }),
    preset: (theme) => ({
        marginRight: theme.spacing(1),
    }),
    cards: (theme) => ({
        display: 'flex',
        flexWrap: 'wrap',
        gap: theme.spacing(2),
        marginBottom: theme.spacing(2),
    }),
    section: (theme) => ({
        padding: theme.spacing(2),
        marginBottom: theme.spacing(2),
    }),
    chart: {
        height: 320,
    },
    member: {
        display: 'flex',
        alignItems: 'center',
    },
    memberName: (theme) => ({
        marginLeft: theme.spacing(1.5),
    }),
    share: {
        display: 'flex',
        alignItems: 'center',
        minWidth: 160,
    },
    shareBar: (theme) => ({
        flexGrow: 1,
        marginRight: theme.spacing(1),
    }),
    shareText: {
        minWidth: 48,
        textAlign: 'right',
    },
} satisfies Record<string, SxProps<MuiTheme>>;
