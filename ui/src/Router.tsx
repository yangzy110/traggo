import * as React from 'react';
import {useQuery} from '@apollo/client/react';
import {CurrentUser} from './gql/types';
import * as gqlUser from './gql/user';
import {CenteredSpinner} from './common/CenteredSpinner';
import {LoginPage} from './login/LoginPage';
import {Typography} from '@material-ui/core';
import Button from '@material-ui/core/Button';
import type {ErrorLike} from '@apollo/client';
import {CombinedGraphQLErrors} from '@apollo/client/errors';
import Grid from '@material-ui/core/Grid';
import {DefaultPaper} from './common/DefaultPaper';
import {Page} from './common/Page';
import {Redirect, Route, Switch} from 'react-router';
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
        <Switch>
            <Route path="/user/login">{loggedIn ? <Redirect to="/" /> : <LoginPage />}</Route>
            {loggedIn ? null : <Redirect to="/user/login" />}

            <Page>
                <Route path="/dashboards" component={DashboardsPage} />
                <Route path="/dashboard/:id" component={DashboardPage} />
                <Route exact path="/timesheet/list" component={DailyPage} />
                <Route exact path="/timesheet/calendar" component={CalendarPage} />
                <Route exact path="/team" component={TeamPage} />
                <Route exact path="/team/:userId" component={TeamMemberPage} />
                <Route exact path="/stats" component={StatsPage} />
                <Route exact path="/user/settings" component={SettingsPage} />
                <Route exact path="/user/devices" component={DevicesPage} />
                <Route exact path="/user/tags" component={TagPage} />
                {admin ? <Route exact path="/admin/users" component={UsersPage} /> : null}
                <Route exact path="/" render={() => <Redirect to="/timesheet/calendar" />} />
            </Page>
        </Switch>
    );
};

const Error: React.FC<{error: ErrorLike; refetch: () => void}> = ({error, refetch}) => {
    return (
        <Grid container direction="row" alignItems="center" justify="center" style={{height: '100%'}}>
            <Grid item>
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
            </Grid>
        </Grid>
    );
};

export const TODO = () => {
    return (
        <Typography align="center" variant={'h2'}>
            TODO
        </Typography>
    );
};
