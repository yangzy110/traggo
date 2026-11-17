import type {Theme} from '@mui/material/styles';

// Tags are solid labels in the chosen color with white text, so that they are easy to see in both themes.
export const tagStyle = (_theme: Theme, color: string) => ({
    backgroundColor: color,
    borderColor: color,
    color: '#fff',
});
