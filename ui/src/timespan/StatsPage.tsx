import * as React from 'react';
import moment from 'moment-timezone';
import {useQuery} from '@apollo/client/react';
import {Link as RouterLink} from 'react-router-dom';
import {CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ExpandMore from '@mui/icons-material/ExpandMore';
import ExpandLess from '@mui/icons-material/ExpandLess';
import {TagChip} from '../common/TagChip';
import {calculateColor, ColorMode} from './colorutils';
import MuiLink from '@mui/material/Link';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import {useTheme} from '@mui/material';
import * as gqlTimeSpan from '../gql/timeSpan';
import {TeamStatistics, TeamStatisticsVariables} from '../gql/types';
import {CenteredSpinner} from '../common/CenteredSpinner';
import {inUserTz} from './timeutils';
import {MemberAvatar} from './MemberAvatar';
import {DAY_FORMAT, formatDuration, MAX_STATS_DAYS, validateRange} from './teamutils';
import {memberLogPath} from './TeamPage';
import Box from '@mui/material/Box';
import type {SxProps, Theme as MuiTheme} from '@mui/material/styles';

const PRESETS = [
    {value: 'week', label: '近一周', days: 7},
    {value: 'month', label: '近一个月', days: 30},
    {value: 'year', label: '近一年', days: 365},
] as const;

type Preset = (typeof PRESETS)[number]['value'] | 'custom';

const styles = {
    controls: (theme) => ({
        display: 'flex',
        alignItems: 'center',
        marginBottom: theme.spacing(2),
        flexWrap: 'wrap',
    }),
    separator: (theme) => ({
        margin: theme.spacing(0, 1),
    }),
    preset: (theme) => ({
        marginRight: theme.spacing(1),
    }),
    section: (theme) => ({
        padding: theme.spacing(2),
        marginBottom: theme.spacing(2),
    }),
    chart: {
        height: 320,
    },
    member: {
        display: 'flex',
        alignItems: 'center',
    },
    memberName: (theme) => ({
        marginLeft: theme.spacing(1.5),
    }),
    share: {
        display: 'flex',
        alignItems: 'center',
        minWidth: 160,
    },
    shareBar: (theme) => ({
        flexGrow: 1,
        marginRight: theme.spacing(1),
    }),
    shareText: {
        minWidth: 48,
        textAlign: 'right',
    },
} satisfies Record<string, SxProps<MuiTheme>>;

const ShareBar: React.FC<{share: number}> = ({share}) => (
    <Box sx={styles.share}>
        <LinearProgress sx={styles.shareBar} variant="determinate" value={Math.min(100, share * 100)} />
        <Box component="span" sx={styles.shareText}>
            {(share * 100).toFixed(1)}%
        </Box>
    </Box>
);

const hours = (seconds: number) => Math.round((seconds / 3600) * 100) / 100;

export const StatsPage: React.FC = () => {
    const theme = useTheme();
    const [preset, setPreset] = React.useState<Preset>('week');
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
    const tagTotal = stats ? stats.tags.reduce((sum, tag) => sum + tag.seconds, 0) : 0;
    const [openTag, setOpenTag] = React.useState('');

    // one click selects the whole range
    const applyPreset = (value: Preset | null) => {
        if (!value) {
            return;
        }
        setPreset(value);
        const preset = PRESETS.find((p) => p.value === value);
        if (preset) {
            setFrom(
                moment()
                    .subtract(preset.days - 1, 'day')
                    .format(DAY_FORMAT)
            );
            setTo(moment().format(DAY_FORMAT));
        }
    };

    return (
        <div>
            <Box sx={styles.controls}>
                <ToggleButtonGroup
                    exclusive
                    size="small"
                    color="primary"
                    value={preset}
                    aria-label="统计范围"
                    sx={styles.preset}
                    onChange={(_, value: Preset | null) => applyPreset(value)}>
                    {PRESETS.map(({value, label}) => (
                        <ToggleButton key={value} value={value}>
                            {label}
                        </ToggleButton>
                    ))}
                    <ToggleButton value="custom">自定义</ToggleButton>
                </ToggleButtonGroup>
                {preset === 'custom' ? (
                    <>
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
                    </>
                ) : null}
            </Box>

            {rangeError ? <Typography color="error">{rangeError}</Typography> : null}
            {error ? <Typography color="error">{error.message}</Typography> : null}
            {!rangeError && loading && !data ? <CenteredSpinner /> : null}

            {stats ? (
                <>
                    <Paper sx={styles.section}>
                        <Typography variant="h6" gutterBottom={true}>
                            团队工作时间(小时/天)
                        </Typography>
                        <Typography color="textSecondary" gutterBottom={true}>
                            合计 {formatDuration(stats.totalSeconds)}
                        </Typography>
                        <Box sx={styles.chart}>
                            <ResponsiveContainer>
                                <LineChart data={stats.days.map(({day, seconds}) => ({day, hours: hours(seconds)}))}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.palette.divider} />
                                    <XAxis
                                        dataKey="day"
                                        tickFormatter={(day: string) => day.slice(5)}
                                        interval="preserveStartEnd"
                                    />
                                    <YAxis
                                        type="number"
                                        unit="h"
                                        allowDecimals={true}
                                        axisLine={false}
                                        tickLine={false}
                                        width={44}
                                        tick={{fill: theme.palette.text.secondary, fontSize: 12}}
                                    />
                                    <Tooltip formatter={(value): [string, string] => [`${value} h`, '工作时间']} />
                                    <Line
                                        type="monotone"
                                        dataKey="hours"
                                        name="工作时间"
                                        stroke={theme.palette.primary.main}
                                        strokeWidth={2.5}
                                        dot={false}
                                        activeDot={{r: 5}}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </Box>
                    </Paper>

                    <Paper sx={styles.section}>
                        <Typography variant="h6" gutterBottom={true}>
                            标签工作量
                        </Typography>
                        {stats.tags.length === 0 ? (
                            <Typography color="textSecondary">这段时间内还没有带标签的记录。</Typography>
                        ) : (
                            <>
                                <Typography variant="caption" color="textSecondary">
                                    占比是该标签在所有标签总时长中的比例（一条记录有多个标签时每个标签都会计入）。点击一行可以查看每个人在该标签下的占比。
                                </Typography>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>标签</TableCell>
                                            <TableCell align="right">工作时间</TableCell>
                                            <TableCell>占比</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {stats.tags.map((tag) => {
                                            const id = tag.key + ':' + tag.value;
                                            const share = tagTotal > 0 ? tag.seconds / tagTotal : 0;
                                            const open = openTag === id;
                                            return (
                                                <React.Fragment key={id}>
                                                    <TableRow
                                                        hover={true}
                                                        sx={{cursor: 'pointer'}}
                                                        onClick={() => setOpenTag(open ? '' : id)}>
                                                        <TableCell>
                                                            <Box sx={styles.member}>
                                                                {open ? (
                                                                    <ExpandLess fontSize="small" />
                                                                ) : (
                                                                    <ExpandMore fontSize="small" />
                                                                )}
                                                                <TagChip
                                                                    label={id}
                                                                    color={calculateColor(
                                                                        tag.key,
                                                                        ColorMode.Bold,
                                                                        theme.palette.mode
                                                                    )}
                                                                />
                                                            </Box>
                                                        </TableCell>
                                                        <TableCell align="right">{formatDuration(tag.seconds)}</TableCell>
                                                        <TableCell>
                                                            <ShareBar share={share} />
                                                        </TableCell>
                                                    </TableRow>
                                                    {open
                                                        ? tag.members.map(({member, seconds}) => (
                                                              <TableRow key={id + member.id}>
                                                                  <TableCell sx={{paddingLeft: 6}}>
                                                                      <Box sx={styles.member}>
                                                                          <MemberAvatar
                                                                              id={member.id}
                                                                              name={member.name}
                                                                              size={24}
                                                                          />
                                                                          <MuiLink
                                                                              sx={styles.memberName}
                                                                              component={RouterLink}
                                                                              to={memberLogPath(member.id)}>
                                                                              {member.name}
                                                                          </MuiLink>
                                                                      </Box>
                                                                  </TableCell>
                                                                  <TableCell align="right">{formatDuration(seconds)}</TableCell>
                                                                  <TableCell>
                                                                      <ShareBar
                                                                          share={tag.seconds > 0 ? seconds / tag.seconds : 0}
                                                                      />
                                                                  </TableCell>
                                                              </TableRow>
                                                          ))
                                                        : null}
                                                </React.Fragment>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </>
                        )}
                    </Paper>

                    <Paper sx={styles.section}>
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
                                                    <Box sx={styles.member}>
                                                        <MemberAvatar id={member.id} name={member.name} size={32} />
                                                        <MuiLink
                                                            sx={styles.memberName}
                                                            component={RouterLink}
                                                            to={memberLogPath(member.id)}
                                                            title={`查看 ${member.name} 的日志`}>
                                                            {member.name}
                                                        </MuiLink>
                                                    </Box>
                                                </TableCell>
                                                <TableCell align="right">{formatDuration(seconds)}</TableCell>
                                                <TableCell>
                                                    <Box sx={styles.share}>
                                                        <LinearProgress
                                                            sx={styles.shareBar}
                                                            variant="determinate"
                                                            value={share * 100}
                                                        />
                                                        <Box component="span" sx={styles.shareText}>
                                                            {(share * 100).toFixed(1)}%
                                                        </Box>
                                                    </Box>
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
