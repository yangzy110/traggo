import * as React from 'react';
import moment from 'moment-timezone';
import {useQuery} from '@apollo/client/react';
import {useNavigate, useParams} from 'react-router-dom';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import BackIcon from '@mui/icons-material/ArrowBack';
import DownloadIcon from '@mui/icons-material/GetApp';
import * as gqlTimeSpan from '../gql/timeSpan';
import {TeamMembers, TeamTimeSpans, TeamTimeSpansVariables} from '../gql/types';
import {CenteredSpinner} from '../common/CenteredSpinner';
import {inUserTz} from './timeutils';
import {TeamEntry, useTagColors} from './TeamEntry';
import {MemberAvatar} from './MemberAvatar';
import Box from '@mui/material/Box';
import type {SxProps, Theme as MuiTheme} from '@mui/material/styles';
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

const styles = {
    header: (theme) => ({
        display: 'flex',
        alignItems: 'center',
        marginBottom: theme.spacing(2),
    }),
    title: (theme) => ({
        marginLeft: theme.spacing(1.5),
        flexGrow: 1,
    }),
    controls: (theme) => ({
        display: 'flex',
        alignItems: 'center',
        marginBottom: theme.spacing(2),
        flexWrap: 'wrap',
    }),
    separator: (theme) => ({
        margin: theme.spacing(0, 1),
    }),
    grow: {
        flexGrow: 1,
    },
    day: (theme) => ({
        marginBottom: theme.spacing(2),
        padding: theme.spacing(2),
    }),
    dayHeader: (theme) => ({
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: theme.spacing(1),
    }),
} satisfies Record<string, SxProps<MuiTheme>>;

export const TeamMemberPage: React.FC = () => {
    const navigate = useNavigate();
    const params = useParams<{userId: string}>();
    const userId = parseInt(params.userId || '', 10);
    const membersResult = useQuery<TeamMembers>(gqlTimeSpan.TeamMembers);
    const member = ((membersResult.data && membersResult.data.teamMembers) || []).find((m) => m.id === userId);
    const name = member ? member.name : '';
    const unknownMember = !!membersResult.data && !member;
    const colors = useTagColors();

    const [from, setFrom] = React.useState(moment().subtract(6, 'day').format(DAY_FORMAT));
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
            <Box sx={styles.header}>
                <IconButton aria-label="back" onClick={() => navigate('/team')}>
                    <BackIcon />
                </IconButton>
                {member ? <MemberAvatar id={userId} name={name} /> : null}
                <Typography variant="h5" sx={styles.title}>
                    {member ? `${name} 的日志` : ''}
                </Typography>
                <Typography color="textSecondary">{rangeError ? '' : `共 ${formatDuration(total)}`}</Typography>
            </Box>

            <Box sx={styles.controls}>
                <TextField
                    variant="standard"
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    slotProps={{inputLabel: {shrink: true}}}
                />
                <Box component="span" sx={styles.separator}>
                    —
                </Box>
                <TextField
                    variant="standard"
                    type="date"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    slotProps={{inputLabel: {shrink: true}}}
                />
                <Box sx={styles.grow} />
                <Button startIcon={<DownloadIcon />} onClick={exportCsv} disabled={items.length === 0}>
                    导出 CSV
                </Button>
            </Box>

            {unknownMember ? <Typography color="error">成员不存在。</Typography> : null}
            {rangeError ? <Typography color="error">{rangeError}</Typography> : null}
            {error ? <Typography color="error">{error.message}</Typography> : null}
            {!rangeError && member && loading && !data ? <CenteredSpinner /> : null}
            {!rangeError && member && data && days.length === 0 ? (
                <Typography color="textSecondary">这段时间没有记录。</Typography>
            ) : null}

            {days.map(({day, entries, seconds}) => (
                <Paper key={day} sx={styles.day}>
                    <Box sx={styles.dayHeader}>
                        <Typography variant="h6">{moment(day, DAY_FORMAT).format('YYYY-MM-DD ddd')}</Typography>
                        <Typography color="textSecondary">共 {formatDuration(seconds)}</Typography>
                    </Box>
                    {entries.map(({timeSpan}) => (
                        <TeamEntry key={timeSpan.id} timeSpan={timeSpan} colors={colors} />
                    ))}
                </Paper>
            ))}
        </div>
    );
};
