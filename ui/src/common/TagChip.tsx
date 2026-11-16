import Chip from '@mui/material/Chip';
import * as React from 'react';
import {tagStyle} from './tagStyle';

interface TagChipProps {
    label: string;
    color: string;
    onClick?: (e: React.MouseEvent) => void;
}

export const TagChip: React.FC<TagChipProps> = ({color, label, onClick}) => (
    <Chip
        tabIndex={-1}
        variant="outlined"
        size="small"
        sx={(theme) => ({
            margin: theme.spacing(0.4, 0.5),
            cursor: onClick ? 'pointer' : 'text',
            minHeight: '24px',
            height: 'fit-content',
            borderRadius: '999px',
            whiteSpace: 'normal',
            wordBreak: 'break-word',
            fontWeight: 600,
            ...tagStyle(theme, color),
            '&:hover': {backgroundColor: tagStyle(theme, color).backgroundColor},
        })}
        label={label}
        onClick={onClick}
    />
);
