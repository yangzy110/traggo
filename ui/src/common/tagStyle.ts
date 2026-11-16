import type {Theme} from '@mui/material/styles';

// Tags are soft labels: a light tint of the color of the tag with a darker text, so that they do not fight with the ui.
export const tagStyle = (theme: Theme, color: string) => {
    const dark = theme.palette.mode === 'dark';
    return {
        backgroundColor: `color-mix(in srgb, ${color} ${dark ? 24 : 16}%, transparent)`,
        borderColor: `color-mix(in srgb, ${color} ${dark ? 45 : 35}%, transparent)`,
        color: `color-mix(in srgb, ${color} ${dark ? 55 : 62}%, ${dark ? 'white' : 'black'})`,
    };
};
