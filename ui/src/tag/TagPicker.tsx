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
import {sortTags} from './defaultTag';

interface TagPickerProps {
    label: string;
    selectedEntries: TagSelectorEntry[];
    onSelectedEntriesChanged: (entries: TagSelectorEntry[]) => void;
}

// Shows all tags side by side, a click selects or unselects a tag. Only one tag can be selected. Tags cannot be created here (admins create them in the
// tag page). Time spans which were created in the past can have a value (key:value), it is kept as long as the tag is selected.
export const TagPicker: React.FC<TagPickerProps> = ({label, selectedEntries, onSelectedEntriesChanged}) => {
    const tagsResult = useQuery<Tags>(gqlTag.Tags);
    // archived tags cannot be added any more, they are only shown while the time span has them
    const definitions = sortTags(
        ((tagsResult.data && tagsResult.data.tags) || []).filter(
            (d) => !d.archived || selectedEntries.some((e) => e.tag.key === d.key)
        )
    );

    const toggle = (key: string) => {
        const definition = definitions.find((d) => d.key === key);
        if (!definition) {
            return;
        }
        // a time span has one tag: a click selects it instead of the other tag, a click on the selected tag unselects it
        const isSelected = selectedEntries.some((e) => e.tag.key === key);
        onSelectedEntriesChanged(isSelected ? [] : [{tag: definition, value: ''}]);
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
                                '&:hover': {
                                    backgroundColor: selected ? color : `color-mix(in srgb, ${color} 18%, transparent)`,
                                },
                            })}
                        />
                    );
                })}
            </Box>
        </Box>
    );
};
