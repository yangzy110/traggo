import type {Theme} from '@mui/material/styles';

// Replacement for `theme.mixins.gutters()` which was removed in Material UI 5.
export const gutters = (theme: Theme) => ({
    paddingLeft: theme.spacing(2),
    paddingRight: theme.spacing(2),
    [theme.breakpoints.up('sm')]: {
        paddingLeft: theme.spacing(3),
        paddingRight: theme.spacing(3),
    },
});
