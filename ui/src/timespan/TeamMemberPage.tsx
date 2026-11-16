import * as React from 'react';
import moment from 'moment-timezone';
import {useQuery} from '@apollo/react-hooks';
import {RouteComponentProps, useHistory} from 'react-router';
import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';
import Paper from '@material-ui/core/Paper';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import BackIcon from '@material-ui/icons/ArrowBack';
import DownloadIcon from '@material-ui/icons/GetApp';
import makeStyles from '@material-ui/core/styles/makeStyles';
import * as gqlTimeSpan from '../gql/timeSpan';
import {TeamMembers} from '../gql/__generated__/TeamMembers';
import {TeamTimeSpans, TeamTimeSpansVariables} from '../gql/__generated__/TeamTimeSpans';
import {CenteredSpinner} from '../common/CenteredSpinner';
import {inUserTz} from './timeutils';
import {TeamEntry, useTagColors} from './TeamEntry';
import {MemberAvatar} from './MemberAvatar';
import {
    DAY_FORMAT,
    exportLog,
    formatDuration,
    LogEntry,
    MAX_LOG_DAYS,
    memberFileName,
    spanSeconds,
    validateRange,
} from './teamutils';

const useStyles = makeStyles((theme) => ({
    header: {
        display: 'flex',
        alignItems: 'center',
        marginBottom: theme.spacing(2),
    },
    title: {
        marginLeft: theme.spacing(1.5),
        flexGrow: 1,
    },
    controls: {
        display: 'flex',
        alignItems: 'center',
        marginBottom: theme.spacing(2),
        flexWrap: 'wrap',
    },
    separator: {
        margin: theme.spacing(0, 1),
    },
    grow: {
        flexGrow: 1,
    },
    day: {
        marginBottom: theme.spacing(2),
        padding: theme.spacing(2),
    },
    dayHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: theme.spacing(1),
    },
}));

type Props = RouteComponentProps<{userId: string}>;

export const TeamMemberPage: React.FC<Props> = ({match}) => {
    const classes = useStyles();
    const history = useHistory();
    const userId = parseInt(match.params.userId, 10);
    const membersResult = useQuery<TeamMembers>(gqlTimeSpan.TeamMembers);
    const member = ((membersResult.data && membersResult.data.teamMembers) || []).find((m) => m.id === userId);
    const name = member ? member.name : '';
    const unknownMember = !!membersResult.data && !member;
    const colors = useTagColors();

    const [from, setFrom] = React.useState(
        moment()
            .subtract(6, 'day')
            .format(DAY_FORMAT)
    );
    const [to, setTo] = React.useState(moment().format(DAY_FORMAT));
    const rangeError = validateRange(from, to, MAX_LOG_DAYS);

    const {data, loading, error} = useQuery<TeamTimeSpans, TeamTimeSpansVariables>(gqlTimeSpan.TeamTimeSpans, {
        variables: {
            start: inUserTz(moment(from, DAY_FORMAT).startOf('day')).format(),
            end: inUserTz(moment(to, DAY_FORMAT).endOf('day')).format(),
            userId,
        },
        skip: !!rangeError || !member,
        fetchPolicy: 'cache-and-network',
    });

    const items = (!rangeError && data && data.teamTimeSpans) || [];
    // Newest day first, a time span is listed on the day it started.
    const days: Array<{day: string; entries: typeof items; seconds: number}> = [];
    items.forEach((item) => {
        const day = moment.parseZone(item.timeSpan.start).format(DAY_FORMAT);
        let group = days.find((d) => d.day === day);
        if (!group) {
            group = {day, entries: [], seconds: 0};
            days.push(group);
        }
        group.entries.push(item);
        if (item.timeSpan.end) {
            group.seconds += spanSeconds(item.timeSpan.start, item.timeSpan.end);
        }
    });
    days.sort((a, b) => b.day.localeCompare(a.day));

    const exportCsv = () => {
        const entries: LogEntry[] = items.map(({user, timeSpan}) => ({...timeSpan, member: user.name}));
        exportLog(memberFileName(name, from, to), entries, false);
    };
    const total = days.reduce((sum, d) => sum + d.seconds, 0);

    return (
        <div>
            <div className={classes.header}>
                <IconButton aria-label="back" onClick={() => history.push('/team')}>
                    <BackIcon />
                </IconButton>
                {member ? <MemberAvatar id={userId} name={name} /> : null}
                <Typography variant="h5" className={classes.title}>
                    {member ? `${name} 的日志` : ''}
                </Typography>
                <Typography color="textSecondary">{rangeError ? '' : `共 ${formatDuration(total)}`}</Typography>
            </div>

            <div className={classes.controls}>
                <TextField type="date" value={from} onChange={(e) => setFrom(e.target.value)} InputLabelProps={{shrink: true}} />
                <span className={classes.separator}>—</span>
                <TextField type="date" value={to} onChange={(e) => setTo(e.target.value)} InputLabelProps={{shrink: true}} />
                <div className={classes.grow} />
                <Button startIcon={<DownloadIcon />} onClick={exportCsv} disabled={items.length === 0}>
                    导出 CSV
                </Button>
            </div>

            {unknownMember ? <Typography color="error">成员不存在。</Typography> : null}
            {rangeError ? <Typography color="error">{rangeError}</Typography> : null}
            {error ? <Typography color="error">{error.message}</Typography> : null}
            {!rangeError && member && loading && !data ? <CenteredSpinner /> : null}
            {!rangeError && member && data && days.length === 0 ? (
                <Typography color="textSecondary">这段时间没有记录。</Typography>
            ) : null}

            {days.map(({day, entries, seconds}) => (
                <Paper key={day} className={classes.day}>
                    <div className={classes.dayHeader}>
                        <Typography variant="h6">{moment(day, DAY_FORMAT).format('YYYY-MM-DD ddd')}</Typography>
                        <Typography color="textSecondary">共 {formatDuration(seconds)}</Typography>
                    </div>
                    {entries.map(({timeSpan}) => (
                        <TeamEntry key={timeSpan.id} timeSpan={timeSpan} colors={colors} />
                    ))}
                </Paper>
            ))}
        </div>
    );
};
