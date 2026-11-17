import * as React from 'react';
import {tagLabel} from '../common/tagLabel';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import {TagChip} from '../common/TagChip';
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

export const TeamEntry: React.FC<TeamEntryProps> = ({timeSpan, tagColors}) => {
    const colors: Record<string, string> = {};
    tagColors.forEach((tag) => (colors[tag.key] = tag.color));
    return (
        <Box
            sx={(theme) => ({
                display: 'flex',
                alignItems: 'flex-start',
                padding: theme.spacing(1, 0),
                borderTop: `1px solid ${theme.palette.divider}`,
            })}>
            <Typography sx={{minWidth: 120, marginRight: 2, fontVariantNumeric: 'tabular-nums'}}>
                {clock(timeSpan.start)} - {timeSpan.end ? clock(timeSpan.end) : ''}
                <br />
                <Typography variant="caption" color="textSecondary">
                    {timeSpan.end ? formatDuration(spanSeconds(timeSpan.start, timeSpan.end)) : ''}
                </Typography>
            </Typography>
            <div>
                <div>
                    {(timeSpan.tags || []).map((tag) => (
                        <TagChip key={tagLabel(tag)} label={tagLabel(tag)} color={colors[tag.key] || DEFAULT_TAG_COLOR} />
                    ))}
                </div>
                {timeSpan.note ? (
                    <Typography variant="body2" sx={{whiteSpace: 'pre-wrap', wordBreak: 'break-word'}}>
                        {timeSpan.note}
                    </Typography>
                ) : null}
            </div>
        </Box>
    );
};
