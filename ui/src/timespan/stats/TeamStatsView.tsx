import * as React from 'react';
import moment from 'moment-timezone';
import {useQuery} from '@apollo/client/react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import * as gqlTimeSpan from '../../gql/timeSpan';
import {TeamStatistics, TeamStatisticsVariables} from '../../gql/types';
import {CenteredSpinner} from '../../common/CenteredSpinner';
import {inUserTz} from '../timeutils';
import {DAY_FORMAT, formatDuration} from '../team/teamutils';
import {statsStyles as styles} from './statsStyles';
import {SummaryCard} from './StatsWidgets';
import {WorkTimeChart} from './WorkTimeChart';
import {TagWorkload} from './TagWorkload';
import {MemberWorkload} from './MemberWorkload';

// The statistics of the whole team, they are meant for admins.
export const TeamStatsView: React.FC<{from: string; to: string}> = ({from, to}) => {
    const {data, loading, error} = useQuery<TeamStatistics, TeamStatisticsVariables>(gqlTimeSpan.TeamStats, {
        variables: {
            start: inUserTz(moment(from, DAY_FORMAT).startOf('day')).format(),
            end: inUserTz(moment(to, DAY_FORMAT).endOf('day')).format(),
        },
        fetchPolicy: 'cache-and-network',
    });

    if (error) {
        return <Typography color="error">{error.message}</Typography>;
    }
    if (!data) {
        return loading ? <CenteredSpinner /> : null;
    }
    const stats = data.teamStats;
    return (
        <>
            <Box sx={styles.cards}>
                <SummaryCard label="总时长" value={formatDuration(stats.totalSeconds)} />
                <SummaryCard label="参与成员" value={`${stats.members.filter((m) => m.seconds > 0).length} / ${stats.members.length}`} />
                <SummaryCard label="日均" value={formatDuration(stats.days.length > 0 ? stats.totalSeconds / stats.days.length : 0)} />
            </Box>
            <WorkTimeChart days={stats.days} />
            <TagWorkload tags={stats.tags} />
            <MemberWorkload members={stats.members} totalSeconds={stats.totalSeconds} />
        </>
    );
};
