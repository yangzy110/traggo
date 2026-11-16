import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import {TagSelector, TagSelectorProps} from './TagSelector';

interface FormTagSelectorProps extends TagSelectorProps {
    label: string;
    required?: boolean;
}

export const FormTagSelector = ({label, required = false, ...props}: FormTagSelectorProps) => {
    return (
        <Box sx={{mt: 2}}>
            <Typography variant="caption" color="text.secondary" sx={{ml: 0.5}}>
                {label}
                {required ? ' *' : ''}
            </Typography>
            <Box
                sx={(theme) => ({
                    border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.23)' : 'rgba(0,0,0,0.23)'}`,
                    borderRadius: '8px',
                    padding: '2px 8px',
                    '&:hover': {borderColor: theme.palette.text.primary},
                    '&:focus-within': {
                        borderColor: theme.palette.primary.main,
                        boxShadow: `0 0 0 1px ${theme.palette.primary.main}`,
                    },
                })}>
                <TagSelector {...props} />
            </Box>
        </Box>
    );
};
