import * as React from 'react';
import {tagLabel} from '../../common/tagLabel';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import {TagChip} from '../../common/TagChip';
import {clock, formatDuration, spanSeconds} from './teamutils';

const DEFAULT_TAG_COLOR = '#9e9e9e';

interface TeamEntryProps {
    timeSpan: {
        start: string;
        end: string | null;
        tags: Array<{key: string; value: string}> | null;
        note: string;
    };
    // the colors of the tags, they depend on the owner of the time span
    tagColors: Array<{key: string; color: string}>;
}

// One row of the log: an accent in the color of the first tag, the time, and the tags and the work content in one line.
export const TeamEntry: React.FC<TeamEntryProps> = ({timeSpan, tagColors}) => {
    const colors: Record<string, string> = {};
    tagColors.forEach((tag) => (colors[tag.key] = tag.color));
    const tags = timeSpan.tags || [];
    const accent = (tags[0] && colors[tags[0].key]) || DEFAULT_TAG_COLOR;
    return (
        <Box
            sx={(theme) => ({
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing(1.5),
                padding: theme.spacing(0.75, 1.5),
                marginTop: theme.spacing(0.75),
                borderRadius: '10px',
                borderLeft: `4px solid ${accent}`,
                backgroundColor: `color-mix(in srgb, ${accent} 6%, transparent)`,
                transition: 'background-color 0.15s',
                '&:hover': {backgroundColor: `color-mix(in srgb, ${accent} 12%, transparent)`},
            })}>
            <Typography
                variant="body2"
                sx={{minWidth: 104, fontWeight: 600, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap'}}>
                {clock(timeSpan.start)} - {timeSpan.end ? clock(timeSpan.end) : '…'}
            </Typography>
            <Box sx={{display: 'flex', alignItems: 'center', flexWrap: 'wrap', flexGrow: 1, minWidth: 0}}>
                {tags.map((tag) => (
                    <TagChip key={tagLabel(tag)} label={tagLabel(tag)} color={colors[tag.key] || DEFAULT_TAG_COLOR} />
                ))}
                {timeSpan.note ? (
                    <Typography
                        variant="body2"
                        sx={{marginLeft: 0.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word', minWidth: 0}}>
                        {timeSpan.note}
                    </Typography>
                ) : null}
            </Box>
            {timeSpan.end ? (
                <Typography
                    variant="caption"
                    color="textSecondary"
                    sx={(theme) => ({
                        flexShrink: 0,
                        padding: theme.spacing(0.25, 1),
                        borderRadius: '999px',
                        backgroundColor: theme.palette.action.hover,
                        fontVariantNumeric: 'tabular-nums',
                    })}>
                    {formatDuration(spanSeconds(timeSpan.start, timeSpan.end))}
                </Typography>
            ) : null}
        </Box>
    );
};
