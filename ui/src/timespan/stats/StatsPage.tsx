import * as React from 'react';
import moment from 'moment-timezone';
import {useQuery} from '@apollo/client/react';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import * as gqlUser from '../../gql/user';
import {CurrentUser} from '../../gql/types';
import {CenteredSpinner} from '../../common/CenteredSpinner';
import {DAY_FORMAT, MAX_STATS_DAYS, validateRange} from '../team/teamutils';
import {StatsRangeControls} from './StatsRangeControls';
import {MyStatsView} from './MyStatsView';
import {TeamStatsView} from './TeamStatsView';

type View = 'mine' | 'team';

// Everybody sees the own hours and how they are divided between the projects. Admins can switch to the statistics of the team.
export const StatsPage: React.FC = () => {
    const [from, setFrom] = React.useState(moment().subtract(6, 'day').format(DAY_FORMAT));
    const [to, setTo] = React.useState(moment().format(DAY_FORMAT));
    const [adminView, setAdminView] = React.useState<View>('team');
    const rangeError = validateRange(from, to, MAX_STATS_DAYS);
    const {data: userData} = useQuery<CurrentUser>(gqlUser.CurrentUser);

    if (!userData || !userData.user) {
        return <CenteredSpinner />;
    }
    const admin = userData.user.admin;
    const view: View = admin ? adminView : 'mine';

    return (
        <div>
            {admin ? (
                <Tabs value={view} onChange={(_, value: View) => setAdminView(value)} sx={{marginBottom: 1}}>
                    <Tab value="team" label="团队统计" />
                    <Tab value="mine" label="我的统计" />
                </Tabs>
            ) : null}
            <StatsRangeControls
                from={from}
                to={to}
                onChange={(newFrom, newTo) => {
                    setFrom(newFrom);
                    setTo(newTo);
                }}
            />

            {rangeError ? <Typography color="error">{rangeError}</Typography> : null}
            {!rangeError && view === 'mine' ? <MyStatsView from={from} to={to} /> : null}
            {!rangeError && view === 'team' ? <TeamStatsView from={from} to={to} /> : null}
        </div>
    );
};
