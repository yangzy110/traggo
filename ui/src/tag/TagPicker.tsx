import * as React from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import CheckIcon from '@mui/icons-material/Check';
import bestContrast from 'get-best-contrast-color';
import {useQuery} from '@apollo/client/react';
import * as gqlTag from '../gql/tags';
import {Tags, UsedTagValues} from '../gql/types';
import {TagSelectorEntry} from './tagSelectorEntry';

interface TagPickerProps {
    label: string;
    selectedEntries: TagSelectorEntry[];
    onSelectedEntriesChanged: (entries: TagSelectorEntry[]) => void;
}

// Shows all existing tags side by side, a click selects or unselects a tag. Tags cannot be created here.
// A time span has at most one value per key, so selecting a tag replaces the other value of the key.
export const TagPicker: React.FC<TagPickerProps> = ({label, selectedEntries, onSelectedEntriesChanged}) => {
    const tagsResult = useQuery<Tags>(gqlTag.Tags);
    const usedResult = useQuery<UsedTagValues>(gqlTag.UsedTagValues, {fetchPolicy: 'cache-and-network'});
    const definitions = (tagsResult.data && tagsResult.data.tags) || [];
    const used = (usedResult.data && usedResult.data.usedTagValues) || [];

    // the tags which are used already and the tags of the time span, which might not be used by another time span
    const options: Array<{key: string; value: string}> = [];
    const add = (key: string, value: string) => {
        if (!options.some((o) => o.key === key && o.value === value) && definitions.some((d) => d.key === key)) {
            options.push({key, value});
        }
    };
    used.forEach((u) => add(u.key, u.value));
    selectedEntries.forEach((e) => add(e.tag.key, e.value));
    options.sort((a, b) => a.key.localeCompare(b.key) || a.value.localeCompare(b.value));

    const toggle = (key: string, value: string) => {
        const definition = definitions.find((d) => d.key === key);
        if (!definition) {
            return;
        }
        const isSelected = selectedEntries.some((e) => e.tag.key === key && e.value === value);
        const others = selectedEntries.filter((e) => e.tag.key !== key);
        onSelectedEntriesChanged(isSelected ? others : [...others, {tag: definition, value}]);
    };

    return (
        <Box sx={{mt: 2}}>
            <Typography variant="caption" color="text.secondary" sx={{ml: 0.5}}>
                {label}
            </Typography>
            <Box sx={{display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 0.5, maxHeight: 180, overflowY: 'auto'}}>
                {options.length === 0 && !usedResult.loading ? (
                    <Typography variant="body2" color="text.secondary" sx={{ml: 0.5}}>
                        还没有可选择的标签
                    </Typography>
                ) : null}
                {options.map(({key, value}) => {
                    const color = definitions.find((d) => d.key === key)!.color;
                    const isSelected = selectedEntries.some((e) => e.tag.key === key && e.value === value);
                    return (
                        <Chip
                            key={`${key}:${value}`}
                            size="small"
                            label={`${key}:${value}`}
                            icon={isSelected ? <CheckIcon style={{color: 'inherit'}} /> : undefined}
                            onClick={() => toggle(key, value)}
                            aria-pressed={isSelected}
                            variant={isSelected ? 'filled' : 'outlined'}
                            style={
                                isSelected
                                    ? {background: color, color: bestContrast(color, ['#fff', '#000']), borderColor: color}
                                    : {borderColor: color}
                            }
                        />
                    );
                })}
            </Box>
        </Box>
    );
};
