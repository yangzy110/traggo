import * as React from 'react';
import moment from 'moment-timezone';
import {useQuery} from '@apollo/client/react';
import {useNavigate, useParams} from 'react-router-dom';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import BackIcon from '@mui/icons-material/ArrowBack';
import {ExportCsvButton} from '../common/ExportCsvButton';
import * as gqlTimeSpan from '../gql/timeSpan';
import {TeamMembers, TeamTimeSpans, TeamTimeSpansVariables} from '../gql/types';
import {CenteredSpinner} from '../common/CenteredSpinner';
import {inUserTz} from './timeutils';
import {TeamEntry} from './TeamEntry';
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
        marginBottom: theme.spacing(2.5),
        padding: theme.spacing(2),
        borderRadius: '16px',
        boxShadow: theme.shadows[1],
    }),
    dayHeader: (theme) => ({
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: theme.spacing(1.5),
        borderBottom: `1px solid ${theme.palette.divider}`,
    }),
    total: (theme) => ({
        padding: theme.spacing(0.5, 1.5),
        borderRadius: '999px',
        fontWeight: 600,
        backgroundColor: theme.palette.action.selected,
    }),
} satisfies Record<string, SxProps<MuiTheme>>;

interface DayGroup {
    day: string;
    entries: TeamTimeSpans['teamTimeSpans'];
    seconds: number;
}

// Newest day first, a time span is listed on the day it started.
const groupByDay = (items: TeamTimeSpans['teamTimeSpans']): DayGroup[] => {
    const days: DayGroup[] = [];
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
    return days.sort((a, b) => b.day.localeCompare(a.day));
};

const MemberHeader: React.FC<{member?: {name: string}; userId: number; subtitle: string}> = ({member, userId, subtitle}) => {
    const navigate = useNavigate();
    return (
        <Box sx={styles.header}>
            <IconButton aria-label="返回" onClick={() => navigate('/team')}>
                <BackIcon />
            </IconButton>
            {member ? <MemberAvatar id={userId} name={member.name} size={44} /> : null}
            <Typography variant="h5" sx={styles.title}>
                {member ? `${member.name} 的日志` : ''}
            </Typography>
            <Typography color="textSecondary">{subtitle}</Typography>
        </Box>
    );
};

const Messages: React.FC<{
    unknownMember: boolean;
    rangeError: string | null;
    error: string | null;
    loading: boolean;
    empty: boolean;
}> = ({unknownMember, rangeError, error, loading, empty}) => (
    <>
        {unknownMember ? <Typography color="error">成员不存在。</Typography> : null}
        {rangeError ? <Typography color="error">{rangeError}</Typography> : null}
        {error ? <Typography color="error">{error}</Typography> : null}
        {loading ? <CenteredSpinner /> : null}
        {empty ? <Typography color="textSecondary">这段时间没有记录。</Typography> : null}
    </>
);

const DayCard: React.FC<{group: DayGroup}> = ({group: {day, entries, seconds}}) => (
    <Paper sx={styles.day}>
        <Box sx={styles.dayHeader}>
            <Typography variant="h6">{moment(day, DAY_FORMAT).format('YYYY-MM-DD ddd')}</Typography>
            <Typography variant="body2" sx={styles.total}>
                共 {formatDuration(seconds)}
            </Typography>
        </Box>
        {entries.map(({timeSpan, tagColors}) => (
            <TeamEntry key={timeSpan.id} timeSpan={timeSpan} tagColors={tagColors} />
        ))}
    </Paper>
);

export const TeamMemberPage: React.FC = () => {
    const params = useParams<{userId: string}>();
    const userId = parseInt(params.userId || '', 10);
    const membersResult = useQuery<TeamMembers>(gqlTimeSpan.TeamMembers);
    const member = ((membersResult.data && membersResult.data.teamMembers) || []).find((m) => m.id === userId);
    const name = member ? member.name : '';
    const unknownMember = !!membersResult.data && !member;

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
    const days = groupByDay(items);

    const exportCsv = () => {
        const entries: LogEntry[] = items.map(({user, timeSpan}) => ({...timeSpan, member: user.name}));
        exportLog(memberFileName(name, from, to), entries);
    };
    const total = days.reduce((sum, d) => sum + d.seconds, 0);

    return (
        <div>
            <MemberHeader member={member} userId={userId} subtitle={rangeError ? '' : `共 ${formatDuration(total)}`} />

            <Box sx={styles.controls}>
                <TextField
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    slotProps={{inputLabel: {shrink: true}}}
                />
                <Box component="span" sx={styles.separator}>
                    —
                </Box>
                <TextField
                    type="date"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    slotProps={{inputLabel: {shrink: true}}}
                />
                <Box sx={styles.grow} />
                <ExportCsvButton onClick={exportCsv} disabled={items.length === 0} />
            </Box>

            <Messages
                unknownMember={unknownMember}
                rangeError={rangeError}
                error={error ? error.message : null}
                loading={!rangeError && !!member && loading && !data}
                empty={!rangeError && !!member && !!data && days.length === 0}
            />

            {days.map((group) => (
                <DayCard key={group.day} group={group} />
            ))}
        </div>
    );
};
