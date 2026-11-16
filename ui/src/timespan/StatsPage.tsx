import * as React from 'react';
import moment from 'moment-timezone';
import {useQuery} from '@apollo/client/react';
import {Link as RouterLink} from 'react-router-dom';
import {CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import Button from '@material-ui/core/Button';
import MuiLink from '@material-ui/core/Link';
import LinearProgress from '@material-ui/core/LinearProgress';
import Paper from '@material-ui/core/Paper';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import makeStyles from '@material-ui/core/styles/makeStyles';
import {useTheme} from '@material-ui/core';
import * as gqlTimeSpan from '../gql/timeSpan';
import {TeamStatistics, TeamStatisticsVariables} from '../gql/types';
import {CenteredSpinner} from '../common/CenteredSpinner';
import {inUserTz} from './timeutils';
import {MemberAvatar} from './MemberAvatar';
import {DAY_FORMAT, formatDuration, MAX_STATS_DAYS, validateRange} from './teamutils';
import {memberLogPath} from './TeamPage';

const PRESETS = [
    {label: '近 7 天', days: 7},
    {label: '近 14 天', days: 14},
    {label: '近 30 天', days: 30},
];

const useStyles = makeStyles((theme) => ({
    controls: {
        display: 'flex',
        alignItems: 'center',
        marginBottom: theme.spacing(2),
        flexWrap: 'wrap',
    },
    separator: {
        margin: theme.spacing(0, 1),
    },
    preset: {
        marginRight: theme.spacing(1),
    },
    section: {
        padding: theme.spacing(2),
        marginBottom: theme.spacing(2),
    },
    chart: {
        height: 320,
    },
    member: {
        display: 'flex',
        alignItems: 'center',
    },
    memberName: {
        marginLeft: theme.spacing(1.5),
    },
    share: {
        display: 'flex',
        alignItems: 'center',
        minWidth: 160,
    },
    shareBar: {
        flexGrow: 1,
        marginRight: theme.spacing(1),
    },
    shareText: {
        minWidth: 48,
        textAlign: 'right',
    },
}));

const hours = (seconds: number) => Math.round((seconds / 3600) * 100) / 100;

export const StatsPage: React.FC = () => {
    const classes = useStyles();
    const theme = useTheme();
    const [from, setFrom] = React.useState(moment().subtract(6, 'day').format(DAY_FORMAT));
    const [to, setTo] = React.useState(moment().format(DAY_FORMAT));
    const rangeError = validateRange(from, to, MAX_STATS_DAYS);

    const {data, loading, error} = useQuery<TeamStatistics, TeamStatisticsVariables>(gqlTimeSpan.TeamStats, {
        variables: {
            start: inUserTz(moment(from, DAY_FORMAT).startOf('day')).format(),
            end: inUserTz(moment(to, DAY_FORMAT).endOf('day')).format(),
        },
        skip: !!rangeError,
        fetchPolicy: 'cache-and-network',
    });

    const stats = !rangeError && data ? data.teamStats : null;

    const applyPreset = (days: number) => {
        setFrom(
            moment()
                .subtract(days - 1, 'day')
                .format(DAY_FORMAT)
        );
        setTo(moment().format(DAY_FORMAT));
    };

    return (
        <div>
            <div className={classes.controls}>
                {PRESETS.map(({label, days}) => (
                    <Button key={days} className={classes.preset} variant="outlined" onClick={() => applyPreset(days)}>
                        {label}
                    </Button>
                ))}
                <TextField type="date" value={from} onChange={(e) => setFrom(e.target.value)} InputLabelProps={{shrink: true}} />
                <span className={classes.separator}>—</span>
                <TextField type="date" value={to} onChange={(e) => setTo(e.target.value)} InputLabelProps={{shrink: true}} />
            </div>

            {rangeError ? <Typography color="error">{rangeError}</Typography> : null}
            {error ? <Typography color="error">{error.message}</Typography> : null}
            {!rangeError && loading && !data ? <CenteredSpinner /> : null}

            {stats ? (
                <>
                    <Paper className={classes.section}>
                        <Typography variant="h6" gutterBottom={true}>
                            团队工作时间(小时/天)
                        </Typography>
                        <Typography color="textSecondary" gutterBottom={true}>
                            合计 {formatDuration(stats.totalSeconds)}
                        </Typography>
                        <div className={classes.chart}>
                            <ResponsiveContainer>
                                <LineChart data={stats.days.map(({day, seconds}) => ({day, hours: hours(seconds)}))}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis
                                        dataKey="day"
                                        tickFormatter={(day: string) => day.slice(5)}
                                        interval="preserveStartEnd"
                                    />
                                    <YAxis type="number" unit="h" allowDecimals={true} />
                                    <Tooltip formatter={(value: number) => [value + ' h', '工作时间']} />
                                    <Line dataKey="hours" name="工作时间" stroke={theme.palette.primary.main} strokeWidth={3} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </Paper>

                    <Paper className={classes.section}>
                        <Typography variant="h6" gutterBottom={true}>
                            成员工作量
                        </Typography>
                        {stats.members.length === 0 ? (
                            <Typography color="textSecondary">团队里还没有成员。</Typography>
                        ) : (
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>成员</TableCell>
                                        <TableCell align="right">工作时间</TableCell>
                                        <TableCell>占比</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {stats.members.map(({member, seconds}) => {
                                        const share = stats.totalSeconds > 0 ? seconds / stats.totalSeconds : 0;
                                        return (
                                            <TableRow key={member.id} hover={true}>
                                                <TableCell>
                                                    <div className={classes.member}>
                                                        <MemberAvatar id={member.id} name={member.name} size={32} />
                                                        <MuiLink
                                                            className={classes.memberName}
                                                            component={RouterLink}
                                                            to={memberLogPath(member.id)}
                                                            title={`查看 ${member.name} 的日志`}>
                                                            {member.name}
                                                        </MuiLink>
                                                    </div>
                                                </TableCell>
                                                <TableCell align="right">{formatDuration(seconds)}</TableCell>
                                                <TableCell>
                                                    <div className={classes.share}>
                                                        <LinearProgress
                                                            className={classes.shareBar}
                                                            variant="determinate"
                                                            value={share * 100}
                                                        />
                                                        <span className={classes.shareText}>{(share * 100).toFixed(1)}%</span>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                    <TableRow>
                                        <TableCell>
                                            <strong>合计</strong>
                                        </TableCell>
                                        <TableCell align="right">
                                            <strong>{formatDuration(stats.totalSeconds)}</strong>
                                        </TableCell>
                                        <TableCell>
                                            <strong>100%</strong>
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        )}
                    </Paper>
                </>
            ) : null}
        </div>
    );
};
