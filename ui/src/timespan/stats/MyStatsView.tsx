import * as React from 'react';
import moment from 'moment-timezone';
import {useQuery} from '@apollo/client/react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import {useTheme} from '@mui/material';
import * as gqlTimeSpan from '../../gql/timeSpan';
import * as gqlTag from '../../gql/tags';
import {MyStatistics, MyStatisticsVariables, Tags} from '../../gql/types';
import {CenteredSpinner} from '../../common/CenteredSpinner';
import {TagChip} from '../../common/TagChip';
import {tagLabel} from '../../common/tagLabel';
import {formatHours} from '../../utils/duration';
import {calculateColor, ColorMode} from '../colorutils';
import {inUserTz} from '../timeutils';
import {DAY_FORMAT} from '../team/teamutils';
import {statsStyles as styles} from './statsStyles';
import {ShareBar, StackedBar, SummaryCard} from './StatsWidgets';
import {WorkTimeChart} from './WorkTimeChart';

// What a user wants to know about the own work: how many hours in the range, and how the hours are divided between the tags
// (the projects). The hours of the days are shown below.
export const MyStatsView: React.FC<{from: string; to: string}> = ({from, to}) => {
    const theme = useTheme();
    const {data, loading, error} = useQuery<MyStatistics, MyStatisticsVariables>(gqlTimeSpan.MyStats, {
        variables: {
            start: inUserTz(moment(from, DAY_FORMAT).startOf('day')).format(),
            end: inUserTz(moment(to, DAY_FORMAT).endOf('day')).format(),
        },
        fetchPolicy: 'cache-and-network',
    });
    const tagsResult = useQuery<Tags>(gqlTag.Tags);

    if (error) {
        return <Typography color="error">{error.message}</Typography>;
    }
    if (!data) {
        return loading ? <CenteredSpinner /> : null;
    }

    const stats = data.myStats;
    const colors: Record<string, string> = {};
    ((tagsResult.data && tagsResult.data.tags) || []).forEach((tag) => (colors[tag.key] = tag.color));
    const colorOf = (key: string) => colors[key] || calculateColor(key, ColorMode.Soft, theme.palette.mode);

    const daysWithWork = stats.days.filter((day) => day.seconds > 0).length;
    const tagTotal = stats.tags.reduce((sum, tag) => sum + tag.seconds, 0);
    // the time of the time spans without a tag
    const untagged = Math.max(0, stats.totalSeconds - tagTotal);
    const rows = [...stats.tags.map((tag) => ({id: tagLabel(tag), key: tag.key, seconds: tag.seconds}))];
    if (untagged >= 1) {
        rows.push({id: '未分类', key: '', seconds: untagged});
    }
    const rowTotal = rows.reduce((sum, row) => sum + row.seconds, 0);

    return (
        <>
            <Box sx={styles.cards}>
                <SummaryCard label="总工作时间" value={formatHours(stats.totalSeconds)} />
                <SummaryCard label="有记录的天数" value={`${daysWithWork} 天`} />
                <SummaryCard
                    label="平均每个记录日"
                    value={formatHours(daysWithWork > 0 ? stats.totalSeconds / daysWithWork : 0)}
                />
            </Box>

            <Paper sx={styles.section}>
                <Typography variant="h6" gutterBottom={true}>
                    各项目花了多少时间
                </Typography>
                {rows.length === 0 ? (
                    <Typography color="textSecondary">这段时间内还没有工作记录。</Typography>
                ) : (
                    <>
                        <StackedBar
                            parts={rows.map((row) => ({
                                label: row.id,
                                seconds: row.seconds,
                                color: row.key ? colorOf(row.key) : '#9aa0a6',
                            }))}
                        />
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>项目（标签）</TableCell>
                                    <TableCell align="right">工作时间</TableCell>
                                    <TableCell>占比</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {rows.map((row) => (
                                    <TableRow key={row.id}>
                                        <TableCell>
                                            {row.key ? (
                                                <TagChip label={row.id} color={colorOf(row.key)} />
                                            ) : (
                                                <Typography variant="body2" color="textSecondary">
                                                    {row.id}
                                                </Typography>
                                            )}
                                        </TableCell>
                                        <TableCell align="right" sx={{fontVariantNumeric: 'tabular-nums'}}>
                                            {formatHours(row.seconds)}
                                        </TableCell>
                                        <TableCell>
                                            <ShareBar share={rowTotal > 0 ? row.seconds / rowTotal : 0} />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </>
                )}
            </Paper>

            <WorkTimeChart days={stats.days} title="每天工作了多少小时" />
        </>
    );
};
