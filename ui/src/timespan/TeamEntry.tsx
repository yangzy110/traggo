import * as React from 'react';
import {useQuery} from '@apollo/react-hooks';
import Typography from '@material-ui/core/Typography';
import makeStyles from '@material-ui/core/styles/makeStyles';
import * as gqlTag from '../gql/tags';
import {Tags} from '../gql/__generated__/Tags';
import {TagChip} from '../common/TagChip';
import {clock, formatDuration, spanSeconds} from './teamutils';

const DEFAULT_TAG_COLOR = '#9e9e9e';

const useStyles = makeStyles((theme) => ({
    entry: {
        display: 'flex',
        alignItems: 'flex-start',
        padding: theme.spacing(1, 0),
        borderTop: `1px solid ${theme.palette.divider}`,
    },
    time: {
        minWidth: 120,
        marginRight: theme.spacing(2),
        fontVariantNumeric: 'tabular-nums',
    },
    note: {
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
    },
}));

// Maps a tag key to its color.
export const useTagColors = (): Record<string, string> => {
    const result = useQuery<Tags>(gqlTag.Tags);
    const colors: Record<string, string> = {};
    ((result.data && result.data.tags) || []).forEach((tag) => (colors[tag.key] = tag.color));
    return colors;
};

interface TeamEntryProps {
    timeSpan: {
        start: string;
        end: string | null;
        tags: Array<{key: string; value: string}> | null;
        note: string;
    };
    colors: Record<string, string>;
}

export const TeamEntry: React.FC<TeamEntryProps> = ({timeSpan, colors}) => {
    const classes = useStyles();
    return (
        <div className={classes.entry}>
            <Typography className={classes.time}>
                {clock(timeSpan.start)} - {timeSpan.end ? clock(timeSpan.end) : ''}
                <br />
                <Typography variant="caption" color="textSecondary">
                    {timeSpan.end ? formatDuration(spanSeconds(timeSpan.start, timeSpan.end)) : ''}
                </Typography>
            </Typography>
            <div>
                <div>
                    {(timeSpan.tags || []).map((tag) => (
                        <TagChip
                            key={tag.key + ':' + tag.value}
                            label={tag.key + ':' + tag.value}
                            color={colors[tag.key] || DEFAULT_TAG_COLOR}
                        />
                    ))}
                </div>
                {timeSpan.note ? (
                    <Typography variant="body2" className={classes.note}>
                        {timeSpan.note}
                    </Typography>
                ) : null}
            </div>
        </div>
    );
};
