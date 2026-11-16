import * as React from 'react';
import {useQuery} from '@apollo/client/react';
import {CurrentUser} from './gql/types';
import * as gqlUser from './gql/user';
import {CenteredSpinner} from './common/CenteredSpinner';
import {LoginPage} from './login/LoginPage';
import {Typography} from '@mui/material';
import Button from '@mui/material/Button';
import type {ErrorLike} from '@apollo/client';
import {CombinedGraphQLErrors} from '@apollo/client/errors';
import Box from '@mui/material/Box';
import {DefaultPaper} from './common/DefaultPaper';
import {Page} from './common/Page';
import {Navigate, Outlet, Route, Routes} from 'react-router-dom';
import {DailyPage} from './timespan/DailyPage';
import {DevicesPage} from './devices/DevicesPage';
import {UsersPage} from './user/UsersPage';
import {DashboardPage} from './dashboard/DashboardPage';
import {DashboardsPage} from './dashboard/DashboardsPage';
import {TagPage} from './tag/TagPage';
import {SettingsPage} from './setting/SettingsPage';
import {TeamPage} from './timespan/TeamPage';
import {TeamMemberPage} from './timespan/TeamMemberPage';
import {StatsPage} from './timespan/StatsPage';
import {CalendarPage} from './timespan/calendar/CalendarPage';

export const Router = () => {
    const {loading, error, data, refetch} = useQuery<CurrentUser>(gqlUser.CurrentUser);
    if (loading) {
        return <CenteredSpinner />;
    }
    if (error) {
        return <Error refetch={refetch} error={error} />;
    }
    const loggedIn = data && data.user;
    const admin = data && data.user && data.user.admin;

    return (
        <Routes>
            <Route path="/user/login" element={loggedIn ? <Navigate to="/" replace /> : <LoginPage />} />
            {loggedIn ? (
                <Route
                    element={
                        <Page>
                            <Outlet />
                        </Page>
                    }>
                    <Route path="/dashboards" element={<DashboardsPage />} />
                    <Route path="/dashboard/:id/*" element={<DashboardPage />} />
                    <Route path="/timesheet/list" element={<DailyPage />} />
                    <Route path="/timesheet/calendar" element={<CalendarPage />} />
                    <Route path="/team" element={<TeamPage />} />
                    <Route path="/team/:userId" element={<TeamMemberPage />} />
                    <Route path="/stats" element={<StatsPage />} />
                    <Route path="/user/settings" element={<SettingsPage />} />
                    <Route path="/user/devices" element={<DevicesPage />} />
                    <Route path="/user/tags" element={<TagPage />} />
                    {admin ? <Route path="/admin/users" element={<UsersPage />} /> : null}
                    <Route path="/" element={<Navigate to="/timesheet/calendar" replace />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
            ) : (
                <Route path="*" element={<Navigate to="/user/login" replace />} />
            )}
        </Routes>
    );
};

const Error: React.FC<{error: ErrorLike; refetch: () => void}> = ({error, refetch}) => {
    return (
        <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%'}}>
            <Box>
                <DefaultPaper>
                    <Typography variant="h3" component="h1" gutterBottom={true}>
                        Error
                    </Typography>
                    <Typography component="p">
                        {CombinedGraphQLErrors.is(error)
                            ? error.errors.map((gqlError) => gqlError.message).join(', ')
                            : error.name + ': ' + error.message}
                    </Typography>
                    <Button style={{marginTop: 10}} size="large" variant="outlined" onClick={() => refetch()}>
                        Retry
                    </Button>
                </DefaultPaper>
            </Box>
        </Box>
    );
};

export const TODO = () => {
    return (
        <Typography align="center" variant={'h2'}>
            TODO
        </Typography>
    );
};
