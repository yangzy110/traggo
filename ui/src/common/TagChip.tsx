import Chip from '@mui/material/Chip';
import * as React from 'react';
import bestContrast from 'get-best-contrast-color';
import type {SxProps, Theme as MuiTheme} from '@mui/material/styles';

const styles = {
    chip: (theme) => ({
        margin: theme.spacing(0.5, 0.6),
        cursor: 'text',
        minHeight: '32px',
        height: 'fit-content',
        whiteSpace: 'normal',
        wordBreak: 'break-word',
    }),
} satisfies Record<string, SxProps<MuiTheme>>;

interface TagChipProps {
    label: string;
    color: string;
    onClick?: (e: React.MouseEvent) => void;
}

export const TagChip: React.FC<TagChipProps> = ({color, label, onClick}) => {
    const textColor = bestContrast(color, ['#fff', '#000']);
    return (
        <Chip
            tabIndex={-1}
            variant="outlined"
            sx={styles.chip}
            style={{background: color, color: textColor}}
            label={label}
            onClick={onClick}
        />
    );
};
