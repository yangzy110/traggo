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

// One entry of a timeline: the times on the left, a line with a dot in the color of the first tag, then the tags and the
// work content in one row and the duration on the right. The entries are separated by space and not by colored blocks.
export const TeamEntry: React.FC<TeamEntryProps> = ({timeSpan, tagColors}) => {
    const colors: Record<string, string> = {};
    tagColors.forEach((tag) => (colors[tag.key] = tag.color));
    const tags = timeSpan.tags || [];
    const accent = (tags[0] && colors[tags[0].key]) || DEFAULT_TAG_COLOR;
    return (
        <Box
            sx={(theme) => ({
                position: 'relative',
                display: 'grid',
                gridTemplateColumns: '56px 1fr auto',
                columnGap: theme.spacing(3),
                alignItems: 'start',
                padding: theme.spacing(1.25, 1, 1.25, 0),
                borderRadius: '8px',
                transition: 'background-color 0.15s',
                '&:hover': {backgroundColor: theme.palette.action.hover},
                // the line of the timeline, it ends at the dot of the last entry
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    left: 56 + 12 - 1,
                    top: 0,
                    bottom: 0,
                    width: 2,
                    backgroundColor: theme.palette.divider,
                },
                '&:last-child::before': {bottom: 'auto', height: 22},
                // the dot
                '&::after': {
                    content: '""',
                    position: 'absolute',
                    left: 56 + 12 - 5,
                    top: 17,
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    backgroundColor: accent,
                    boxShadow: `0 0 0 3px ${theme.palette.background.paper}`,
                },
            })}>
            <Box sx={{fontVariantNumeric: 'tabular-nums', lineHeight: 1.35}}>
                <Typography variant="body2" sx={{fontWeight: 700}}>
                    {clock(timeSpan.start)}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                    {timeSpan.end ? clock(timeSpan.end) : '…'}
                </Typography>
            </Box>
            <Box
                sx={(theme) => ({
                    display: 'flex',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    minWidth: 0,
                    paddingLeft: theme.spacing(1.5),
                })}>
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
                    sx={{whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', paddingTop: '2px'}}>
                    {formatDuration(spanSeconds(timeSpan.start, timeSpan.end))}
                </Typography>
            ) : null}
        </Box>
    );
};
