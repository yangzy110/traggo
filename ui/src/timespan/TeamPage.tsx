import * as React from 'react';
import moment from 'moment-timezone';
import prettyMs from 'pretty-ms';
import {useQuery} from '@apollo/react-hooks';
import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';
import Paper from '@material-ui/core/Paper';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import PrevIcon from '@material-ui/icons/ChevronLeft';
import NextIcon from '@material-ui/icons/ChevronRight';
import makeStyles from '@material-ui/core/styles/makeStyles';
import * as gqlTimeSpan from '../gql/timeSpan';
import * as gqlTag from '../gql/tags';
import {TeamTimeSpans, TeamTimeSpansVariables} from '../gql/__generated__/TeamTimeSpans';
import {Tags} from '../gql/__generated__/Tags';
import {CenteredSpinner} from '../common/CenteredSpinner';
import {TagChip} from '../common/TagChip';
import {inUserTz} from './timeutils';

const DATE_FORMAT = 'YYYY-MM-DD';
const DEFAULT_TAG_COLOR = '#9e9e9e';

const useStyles = makeStyles((theme) => ({
    controls: {
        display: 'flex',
        alignItems: 'center',
        marginBottom: theme.spacing(2),
        flexWrap: 'wrap',
    },
    member: {
        marginBottom: theme.spacing(2),
        padding: theme.spacing(2),
    },
    memberHeader: {
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        marginBottom: theme.spacing(1),
    },
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

interface Member {
    id: number;
    name: string;
    seconds: number;
    entries: TeamTimeSpans['teamTimeSpans'];
}

// The server returns the time with the offset of its owner, so parseZone shows the wall-clock time the owner saw.
const clock = (value: string) => moment.parseZone(value).format('HH:mm');
const seconds = (start: string, end: string) => Math.max(0, moment.parseZone(end).diff(moment.parseZone(start), 'seconds'));
const duration = (s: number) => (s < 60 ? '<1m' : prettyMs(s * 1000, {unitCount: 2, secondsDecimalDigits: 0}));

const groupByMember = (items: TeamTimeSpans['teamTimeSpans']): Member[] => {
    const members: Member[] = [];
    items.forEach((item) => {
        let member = members.find((m) => m.id === item.user.id);
        if (!member) {
            member = {id: item.user.id, name: item.user.name, seconds: 0, entries: []};
            members.push(member);
        }
        member.entries.push(item);
        if (item.timeSpan.end) {
            member.seconds += seconds(item.timeSpan.start, item.timeSpan.end);
        }
    });
    return members.sort((a, b) => a.name.localeCompare(b.name));
};

export const TeamPage: React.FC = () => {
    const classes = useStyles();
    const [date, setDate] = React.useState(moment().format(DATE_FORMAT));

    const day = moment(date, DATE_FORMAT);
    const validDay = day.isValid();
    const start = inUserTz(day.clone().startOf('day')).format();
    const end = inUserTz(day.clone().endOf('day')).format();

    const {data, loading, error} = useQuery<TeamTimeSpans, TeamTimeSpansVariables>(gqlTimeSpan.TeamTimeSpans, {
        variables: {start, end},
        skip: !validDay,
        fetchPolicy: 'cache-and-network',
    });
    const tagsResult = useQuery<Tags>(gqlTag.Tags);
    const colors: Record<string, string> = {};
    ((tagsResult.data && tagsResult.data.tags) || []).forEach((tag) => (colors[tag.key] = tag.color));

    const shift = (days: number) =>
        setDate(
            day
                .clone()
                .add(days, 'day')
                .format(DATE_FORMAT)
        );
    const members = groupByMember((data && data.teamTimeSpans) || []);

    return (
        <div>
            <div className={classes.controls}>
                <IconButton aria-label="previous day" onClick={() => shift(-1)} disabled={!validDay}>
                    <PrevIcon />
                </IconButton>
                <TextField type="date" value={date} onChange={(e) => setDate(e.target.value)} InputLabelProps={{shrink: true}} />
                <IconButton aria-label="next day" onClick={() => shift(1)} disabled={!validDay}>
                    <NextIcon />
                </IconButton>
                <Button onClick={() => setDate(moment().format(DATE_FORMAT))}>今天</Button>
            </div>

            {error ? <Typography color="error">{error.message}</Typography> : null}
            {loading && !data ? <CenteredSpinner /> : null}
            {data && members.length === 0 ? <Typography color="textSecondary">这一天团队里没有人记录工作。</Typography> : null}

            {members.map((member) => (
                <Paper key={member.id} className={classes.member}>
                    <div className={classes.memberHeader}>
                        <Typography variant="h6">{member.name}</Typography>
                        <Typography color="textSecondary">共 {duration(member.seconds)}</Typography>
                    </div>
                    {member.entries.map(({timeSpan}) => (
                        <div key={timeSpan.id} className={classes.entry}>
                            <Typography className={classes.time}>
                                {clock(timeSpan.start)} - {timeSpan.end ? clock(timeSpan.end) : ''}
                                <br />
                                <Typography variant="caption" color="textSecondary">
                                    {timeSpan.end ? duration(seconds(timeSpan.start, timeSpan.end)) : ''}
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
                    ))}
                </Paper>
            ))}
        </div>
    );
};
