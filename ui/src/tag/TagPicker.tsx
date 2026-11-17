import * as React from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import CheckIcon from '@mui/icons-material/Check';
import {useQuery} from '@apollo/client/react';
import * as gqlTag from '../gql/tags';
import {Tags} from '../gql/types';
import {tagStyle} from '../common/tagStyle';
import {tagLabel} from '../common/tagLabel';
import {TagSelectorEntry} from './tagSelectorEntry';

interface TagPickerProps {
    label: string;
    selectedEntries: TagSelectorEntry[];
    onSelectedEntriesChanged: (entries: TagSelectorEntry[]) => void;
}

// Shows all tags side by side, a click selects or unselects a tag. Tags cannot be created here (admins create them in the
// tag page). Time spans which were created in the past can have a value (key:value), it is kept as long as the tag is selected.
export const TagPicker: React.FC<TagPickerProps> = ({label, selectedEntries, onSelectedEntriesChanged}) => {
    const tagsResult = useQuery<Tags>(gqlTag.Tags);
    const definitions = [...((tagsResult.data && tagsResult.data.tags) || [])].sort((a, b) => a.key.localeCompare(b.key));

    const toggle = (key: string) => {
        const definition = definitions.find((d) => d.key === key);
        if (!definition) {
            return;
        }
        const isSelected = selectedEntries.some((e) => e.tag.key === key);
        const others = selectedEntries.filter((e) => e.tag.key !== key);
        onSelectedEntriesChanged(isSelected ? others : [...others, {tag: definition, value: ''}]);
    };

    return (
        <Box sx={{mt: 2}}>
            <Typography variant="caption" color="text.secondary" sx={{ml: 0.5}}>
                {label}
            </Typography>
            <Box sx={{display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 0.5, maxHeight: 180, overflowY: 'auto'}}>
                {definitions.length === 0 && !tagsResult.loading ? (
                    <Typography variant="body2" color="text.secondary" sx={{ml: 0.5}}>
                        还没有标签，请管理员先创建标签
                    </Typography>
                ) : null}
                {definitions.map(({key, color}) => {
                    const selected = selectedEntries.find((e) => e.tag.key === key);
                    return (
                        <Chip
                            key={key}
                            size="small"
                            label={tagLabel({key, value: selected ? selected.value : ''})}
                            icon={selected ? <CheckIcon style={{color: 'inherit'}} /> : undefined}
                            onClick={() => toggle(key)}
                            aria-pressed={!!selected}
                            variant="outlined"
                            sx={(theme) => ({
                                borderRadius: '999px',
                                fontWeight: 600,
                                ...tagStyle(theme, color),
                                // unselected tags are quiet, selected tags are filled
                                ...(selected
                                    ? {borderWidth: 1.5}
                                    : {backgroundColor: 'transparent', color: theme.palette.text.secondary}),
                                '&:hover': {backgroundColor: tagStyle(theme, color).backgroundColor},
                            })}
                        />
                    );
                })}
            </Box>
        </Box>
    );
};
