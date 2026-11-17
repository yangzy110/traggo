import * as React from 'react';
import Box from '@mui/material/Box';
import CheckIcon from '@mui/icons-material/Check';
import {TAG_PALETTE} from './tagColors';

interface TagColorGridProps {
    value: string;
    onChange: (color: string) => void;
}

// 4 x 4 colors to choose from, other colors are not possible.
export const TagColorGrid: React.FC<TagColorGridProps> = ({value, onChange}) => (
    <Box
        role="radiogroup"
        aria-label="标签颜色"
        sx={{display: 'grid', gridTemplateColumns: 'repeat(4, 32px)', gap: 1, padding: '4px 0'}}>
        {TAG_PALETTE.map((color) => {
            const selected = color.toLowerCase() === value.toLowerCase();
            return (
                <Box
                    key={color}
                    component="button"
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={color}
                    title={color}
                    onClick={() => onChange(color)}
                    sx={(theme) => ({
                        width: 32,
                        height: 32,
                        padding: 0,
                        cursor: 'pointer',
                        borderRadius: '50%',
                        backgroundColor: color,
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: `2px solid ${selected ? theme.palette.text.primary : 'transparent'}`,
                        boxShadow: selected ? `inset 0 0 0 2px ${theme.palette.background.paper}` : 'none',
                        transition: 'transform 0.1s',
                        '&:hover': {transform: 'scale(1.12)'},
                    })}>
                    {selected ? <CheckIcon sx={{fontSize: 18}} /> : null}
                </Box>
            );
        })}
    </Box>
);
