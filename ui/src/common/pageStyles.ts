import type {SxProps, Theme} from '@mui/material/styles';

export const drawerWidth = 240;

export const styles = {
    root: {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
    },
    brand: (theme) => ({
        marginRight: theme.spacing(3),
        color: 'inherit',
        textDecoration: 'none',
    }),
    navButton: (theme) => ({
        marginRight: theme.spacing(0.5),
        padding: theme.spacing(0.75, 1.75),
        fontSize: '0.95rem',
        fontWeight: 500,
        borderRadius: '8px',
        position: 'relative',
        opacity: 0.8,
        '&:hover': {opacity: 1, backgroundColor: 'action.hover'},
    }),
    navButtonActive: {
        opacity: 1,
        fontWeight: 600,
        // the page is marked by a line below of the button
        '&::after': {
            content: '""',
            position: 'absolute',
            left: 14,
            right: 14,
            bottom: -14,
            height: 2,
            borderRadius: 1,
            backgroundColor: 'primary.main',
        },
    },
    menuButton: (theme) => ({
        marginRight: '20px',
        [theme.breakpoints.up('md')]: {
            display: 'none',
        },
    }),
    toolbar: (theme) => ({
        ...theme.mixins.toolbar,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
    }),
    drawer: {
        display: {xs: 'block', md: 'none'},
        '& .MuiDrawer-paper': {width: drawerWidth},
    },
    content: (theme) => ({
        flexGrow: 1,
        paddingTop: theme.spacing(2),
        paddingBottom: theme.spacing(2),
        paddingLeft: theme.spacing(1),
        paddingRight: theme.spacing(1),
        [theme.breakpoints.up('md')]: {
            paddingTop: theme.spacing(3),
            paddingLeft: theme.spacing(3),
            paddingRight: theme.spacing(3),
        },
    }),
    desktopOnly: {
        display: {xs: 'none', md: 'flex'},
        alignItems: 'center',
    },
    mobileOnly: {
        display: {xs: 'block', md: 'none'},
    },
    grow: {
        flexGrow: 1,
    },
    sectionDesktop: {
        display: 'flex',
    },
} satisfies Record<string, SxProps<Theme>>;
