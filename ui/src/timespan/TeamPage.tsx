import * as React from 'react';
import moment from 'moment-timezone';
import {useQuery} from '@apollo/client/react';
import {useNavigate} from 'react-router-dom';
import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';
import Paper from '@material-ui/core/Paper';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import PrevIcon from '@material-ui/icons/ChevronLeft';
import NextIcon from '@material-ui/icons/ChevronRight';
import DownloadIcon from '@material-ui/icons/GetApp';
import makeStyles from '@material-ui/core/styles/makeStyles';
import * as gqlTimeSpan from '../gql/timeSpan';
import {TeamTimeSpans, TeamTimeSpansVariables} from '../gql/types';
import {CenteredSpinner} from '../common/CenteredSpinner';
import {inUserTz} from './timeutils';
import {TeamEntry, useTagColors} from './TeamEntry';
import {MemberAvatar} from './MemberAvatar';
import {DAY_FORMAT, exportLog, formatDuration, LogEntry, spanSeconds} from './teamutils';

const useStyles = makeStyles((theme) => ({
    controls: {
        display: 'flex',
        alignItems: 'center',
        marginBottom: theme.spacing(2),
        flexWrap: 'wrap',
    },
    grow: {
        flexGrow: 1,
    },
    member: {
        marginBottom: theme.spacing(2),
        padding: theme.spacing(2),
    },
    memberHeader: {
        display: 'flex',
        alignItems: 'center',
        marginBottom: theme.spacing(1),
    },
    avatarButton: {
        padding: 0,
        marginRight: theme.spacing(1.5),
    },
    memberName: {
        flexGrow: 1,
    },
}));

interface Member {
    id: number;
    name: string;
    seconds: number;
    entries: TeamTimeSpans['teamTimeSpans'];
}

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
            member.seconds += spanSeconds(item.timeSpan.start, item.timeSpan.end);
        }
    });
    return members.sort((a, b) => a.name.localeCompare(b.name));
};

export const memberLogPath = (id: number) => `/team/${id}`;

export const TeamPage: React.FC = () => {
    const classes = useStyles();
    const navigate = useNavigate();
    const [date, setDate] = React.useState(moment().format(DAY_FORMAT));
    const colors = useTagColors();

    const day = moment(date, DAY_FORMAT, true);
    const validDay = day.isValid();
    const start = inUserTz(day.clone().startOf('day')).format();
    const end = inUserTz(day.clone().endOf('day')).format();

    const {data, loading, error} = useQuery<TeamTimeSpans, TeamTimeSpansVariables>(gqlTimeSpan.TeamTimeSpans, {
        variables: {start, end},
        skip: !validDay,
        fetchPolicy: 'cache-and-network',
    });

    const shift = (days: number) => setDate(day.clone().add(days, 'day').format(DAY_FORMAT));
    const items = (validDay && data && data.teamTimeSpans) || [];
    const members = groupByMember(items);

    const exportCsv = () => {
        const entries: LogEntry[] = items.map(({user, timeSpan}) => ({...timeSpan, member: user.name}));
        exportLog(`traggo-team_${date}.csv`, entries, true);
    };

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
                <Button onClick={() => setDate(moment().format(DAY_FORMAT))}>今天</Button>
                <div className={classes.grow} />
                <Button startIcon={<DownloadIcon />} onClick={exportCsv} disabled={items.length === 0}>
                    导出 CSV
                </Button>
            </div>

            {error ? <Typography color="error">{error.message}</Typography> : null}
            {loading && !data ? <CenteredSpinner /> : null}
            {data && members.length === 0 ? <Typography color="textSecondary">这一天团队里没有人记录工作。</Typography> : null}

            {members.map((member) => (
                <Paper key={member.id} className={classes.member}>
                    <div className={classes.memberHeader}>
                        <IconButton
                            className={classes.avatarButton}
                            title={`查看 ${member.name} 的日志`}
                            aria-label={`查看 ${member.name} 的日志`}
                            onClick={() => navigate(memberLogPath(member.id))}>
                            <MemberAvatar id={member.id} name={member.name} />
                        </IconButton>
                        <Typography variant="h6" className={classes.memberName}>
                            {member.name}
                        </Typography>
                        <Typography color="textSecondary">共 {formatDuration(member.seconds)}</Typography>
                    </div>
                    {member.entries.map(({timeSpan}) => (
                        <TeamEntry key={timeSpan.id} timeSpan={timeSpan} colors={colors} />
                    ))}
                </Paper>
            ))}
        </div>
    );
};
