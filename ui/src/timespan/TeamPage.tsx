import * as React from 'react';
import moment from 'moment-timezone';
import {useQuery} from '@apollo/client/react';
import {useNavigate} from 'react-router-dom';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import PrevIcon from '@mui/icons-material/ChevronLeft';
import NextIcon from '@mui/icons-material/ChevronRight';
import DownloadIcon from '@mui/icons-material/GetApp';
import * as gqlTimeSpan from '../gql/timeSpan';
import {TeamTimeSpans, TeamTimeSpansVariables} from '../gql/types';
import {CenteredSpinner} from '../common/CenteredSpinner';
import {inUserTz} from './timeutils';
import {TeamEntry} from './TeamEntry';
import {MemberAvatar} from './MemberAvatar';
import {DAY_FORMAT, exportLog, formatDuration, LogEntry, spanSeconds} from './teamutils';
import Box from '@mui/material/Box';
import type {SxProps, Theme as MuiTheme} from '@mui/material/styles';

const styles = {
    controls: (theme) => ({
        display: 'flex',
        alignItems: 'center',
        marginBottom: theme.spacing(2),
        flexWrap: 'wrap',
    }),
    grow: {
        flexGrow: 1,
    },
    member: (theme) => ({
        marginBottom: theme.spacing(2),
        padding: theme.spacing(2),
    }),
    memberHeader: (theme) => ({
        display: 'flex',
        alignItems: 'center',
        marginBottom: theme.spacing(1),
    }),
    avatarButton: (theme) => ({
        padding: 0,
        marginRight: theme.spacing(1.5),
    }),
    memberName: {
        flexGrow: 1,
    },
} satisfies Record<string, SxProps<MuiTheme>>;

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
    const navigate = useNavigate();
    const [date, setDate] = React.useState(moment().format(DAY_FORMAT));

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
            <Box sx={styles.controls}>
                <IconButton aria-label="previous day" onClick={() => shift(-1)} disabled={!validDay}>
                    <PrevIcon />
                </IconButton>
                <TextField
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    slotProps={{inputLabel: {shrink: true}}}
                />
                <IconButton aria-label="next day" onClick={() => shift(1)} disabled={!validDay}>
                    <NextIcon />
                </IconButton>
                <Button onClick={() => setDate(moment().format(DAY_FORMAT))}>今天</Button>
                <Box sx={styles.grow} />
                <Button startIcon={<DownloadIcon />} onClick={exportCsv} disabled={items.length === 0}>
                    导出 CSV
                </Button>
            </Box>

            {error ? <Typography color="error">{error.message}</Typography> : null}
            {loading && !data ? <CenteredSpinner /> : null}
            {data && members.length === 0 ? <Typography color="textSecondary">这一天团队里没有人记录工作。</Typography> : null}

            {members.map((member) => (
                <Paper key={member.id} sx={styles.member}>
                    <Box sx={styles.memberHeader}>
                        <IconButton
                            sx={styles.avatarButton}
                            title={`查看 ${member.name} 的日志`}
                            aria-label={`查看 ${member.name} 的日志`}
                            onClick={() => navigate(memberLogPath(member.id))}>
                            <MemberAvatar id={member.id} name={member.name} />
                        </IconButton>
                        <Typography variant="h6" sx={styles.memberName}>
                            {member.name}
                        </Typography>
                        <Typography color="textSecondary">共 {formatDuration(member.seconds)}</Typography>
                    </Box>
                    {member.entries.map(({timeSpan, tagColors}) => (
                        <TeamEntry key={timeSpan.id} timeSpan={timeSpan} tagColors={tagColors} />
                    ))}
                </Paper>
            ))}
        </div>
    );
};
