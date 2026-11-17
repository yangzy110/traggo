import * as React from 'react';
import moment from 'moment-timezone';
import {useQuery} from '@apollo/client/react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import * as gqlTimeSpan from '../../gql/timeSpan';
import {TeamStatistics, TeamStatisticsVariables} from '../../gql/types';
import {CenteredSpinner} from '../../common/CenteredSpinner';
import {inUserTz} from '../timeutils';
import {DAY_FORMAT, formatDuration, MAX_STATS_DAYS, validateRange} from '../team/teamutils';
import {statsStyles as styles} from './statsStyles';
import {SummaryCard} from './StatsWidgets';
import {StatsRangeControls} from './StatsRangeControls';
import {WorkTimeChart} from './WorkTimeChart';
import {TagWorkload} from './TagWorkload';
import {MemberWorkload} from './MemberWorkload';

export const StatsPage: React.FC = () => {
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

    return (
        <div>
            <StatsRangeControls
                from={from}
                to={to}
                onChange={(newFrom, newTo) => {
                    setFrom(newFrom);
                    setTo(newTo);
                }}
            />

            {rangeError ? <Typography color="error">{rangeError}</Typography> : null}
            {error ? <Typography color="error">{error.message}</Typography> : null}
            {!rangeError && loading && !data ? <CenteredSpinner /> : null}

            {stats ? (
                <>
                    <Box sx={styles.cards}>
                        <SummaryCard label="总时长" value={formatDuration(stats.totalSeconds)} />
                        <SummaryCard
                            label="参与成员"
                            value={`${stats.members.filter((m) => m.seconds > 0).length} / ${stats.members.length}`}
                        />
                        <SummaryCard
                            label="日均"
                            value={formatDuration(stats.days.length > 0 ? stats.totalSeconds / stats.days.length : 0)}
                        />
                    </Box>
                    <WorkTimeChart days={stats.days} />
                    <TagWorkload tags={stats.tags} />
                    <MemberWorkload members={stats.members} totalSeconds={stats.totalSeconds} />
                </>
            ) : null}
        </div>
    );
};
