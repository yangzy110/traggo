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
import {ExportCsvButton} from '../common/ExportCsvButton';
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
        marginBottom: theme.spacing(2.5),
        padding: theme.spacing(2),
        borderRadius: '16px',
        boxShadow: theme.shadows[1],
    }),
    memberHeader: (theme) => ({
        display: 'flex',
        alignItems: 'center',
        marginBottom: theme.spacing(1),
        paddingBottom: theme.spacing(1.5),
        borderBottom: `1px solid ${theme.palette.divider}`,
    }),
    total: (theme) => ({
        padding: theme.spacing(0.5, 1.5),
        borderRadius: '999px',
        fontWeight: 600,
        backgroundColor: theme.palette.action.selected,
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
        exportLog(`traggo-team_${date}.csv`, entries);
    };

    return (
        <div>
            <Box sx={styles.controls}>
                <IconButton aria-label="前一天" onClick={() => shift(-1)} disabled={!validDay}>
                    <PrevIcon />
                </IconButton>
                <TextField
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    slotProps={{inputLabel: {shrink: true}}}
                />
                <IconButton aria-label="后一天" onClick={() => shift(1)} disabled={!validDay}>
                    <NextIcon />
                </IconButton>
                <Button onClick={() => setDate(moment().format(DAY_FORMAT))}>今天</Button>
                <Box sx={styles.grow} />
                <ExportCsvButton onClick={exportCsv} disabled={items.length === 0} />
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
                            <MemberAvatar id={member.id} name={member.name} size={44} />
                        </IconButton>
                        <Box sx={styles.memberName}>
                            <Typography variant="h6" sx={{lineHeight: 1.2}}>
                                {member.name}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                                {member.entries.length} 条记录
                            </Typography>
                        </Box>
                        <Typography variant="body2" sx={styles.total}>
                            共 {formatDuration(member.seconds)}
                        </Typography>
                    </Box>
                    {member.entries.map(({timeSpan, tagColors}) => (
                        <TeamEntry key={timeSpan.id} timeSpan={timeSpan} tagColors={tagColors} />
                    ))}
                </Paper>
            ))}
        </div>
    );
};
