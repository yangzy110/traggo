import * as React from 'react';
import AppBar from '@mui/material/AppBar';
import CssBaseline from '@mui/material/CssBaseline';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import UsersIcon from '@mui/icons-material/SupervisorAccount';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import DashboardIcon from '@mui/icons-material/Dashboard';
import MenuIcon from '@mui/icons-material/Menu';
import SettingsIcon from '@mui/icons-material/Settings';
import DevicesIcon from '@mui/icons-material/DevicesOther';
import TeamIcon from '@mui/icons-material/People';
import StatsIcon from '@mui/icons-material/ShowChart';
import LabelIcon from '@mui/icons-material/Label';
import DashboardManageIcon from '@mui/icons-material/ListAlt';
import TimeLineIcon from '@mui/icons-material/Timeline';
import CalendarIcon from '@mui/icons-material/CalendarToday';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import ListSubheader from '@mui/material/ListSubheader';
import Menu from '@mui/material/Menu';
import HrefLink from '@mui/material/Link';
import * as gqlUser from '../gql/user';
import * as gqlVersion from '../gql/version';
import Button from '@mui/material/Button';
import AccountCircle from '@mui/icons-material/AccountCircle';
import {Link, matchPath, useLocation, useNavigate} from 'react-router-dom';
import MenuItem from '@mui/material/MenuItem';
import {useMutation, useQuery} from '@apollo/client/react';
import {Logout, ServerVersion, CurrentUser, Dashboards} from '../gql/types';
import * as gqlDashboard from '../gql/dashboard';
import type {SxProps, Theme} from '@mui/material/styles';

const drawerWidth = 240;

interface NavGroup {
    name: string;
    to?: string;
    paths: string[];
    items: Array<{label: string; to: string}>;
}

const styles = {
    root: {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
    },
    brand: (theme) => ({
        marginRight: theme.spacing(3),
        color: 'inherit',
        textDecoration: 'none',
    }),
    navButton: (theme) => ({
        textTransform: 'none',
        marginRight: theme.spacing(1),
        fontSize: '1rem',
        borderRadius: 0,
        borderBottom: '2px solid transparent',
        height: 64,
    }),
    navButtonActive: {
        borderBottomColor: 'currentColor',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    menuButton: (theme) => ({
        marginRight: '20px',
        [theme.breakpoints.up('md')]: {
            display: 'none',
        },
    }),
    toolbar: (theme) => ({
        ...theme.mixins.toolbar,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
    }),
    drawer: {
        display: {xs: 'block', md: 'none'},
        '& .MuiDrawer-paper': {width: drawerWidth},
    },
    content: (theme) => ({
        flexGrow: 1,
        paddingTop: theme.spacing(2),
        paddingBottom: theme.spacing(2),
        paddingLeft: theme.spacing(1),
        paddingRight: theme.spacing(1),
        [theme.breakpoints.up('md')]: {
            paddingTop: theme.spacing(3),
            paddingLeft: theme.spacing(3),
            paddingRight: theme.spacing(3),
        },
    }),
    desktopOnly: {
        display: {xs: 'none', md: 'flex'},
        alignItems: 'center',
    },
    mobileOnly: {
        display: {xs: 'block', md: 'none'},
    },
    grow: {
        flexGrow: 1,
    },
    sectionDesktop: {
        display: 'flex',
    },
} satisfies Record<string, SxProps<Theme>>;

const pageTitles: Array<[path: string, title: string]> = [
    ['/team', '团队日志'],
    ['/team/:userId', '团队日志 / 成员'],
    ['/stats', '统计'],
    ['/timesheet/list', 'Timesheet / List'],
    ['/timesheet/calendar', '我的日志'],
    ['/user/settings', 'User / Settings'],
    ['/user/devices', 'User / Devices'],
    ['/user/tags', 'User / Tags'],
    ['/admin/users', 'Admin / Users'],
    ['/dashboards', 'Dashboards / Manage'],
];

const pageTitle = (pathname: string, dashboards: Array<{id: number; name: string}>): string => {
    const known = pageTitles.find(([path]) => matchPath(path, pathname));
    if (known) {
        return known[1];
    }
    const dashboardMatch = matchPath('/dashboard/:id/*', pathname);
    if (dashboardMatch) {
        const dashboard = dashboards.find((db) => '' + db.id === dashboardMatch.params.id);
        return 'Dashboards / ' + (dashboard ? dashboard.name : '...');
    }
    return '';
};

export const Page: React.FC<React.PropsWithChildren> = ({children}) => {
    const location = useLocation();
    const navigate = useNavigate();
    const {data} = useQuery<CurrentUser>(gqlUser.CurrentUser);

    const [mobileOpen, setMobileOpen] = React.useState(false);
    const [userMenuOpen, setUserMenuOpen] = React.useState<null | HTMLElement>(null);
    const [navMenu, setNavMenu] = React.useState<null | {name: string; anchor: HTMLElement}>(null);
    const [logout] = useMutation<Logout>(gqlUser.Logout, {refetchQueries: [{query: gqlUser.CurrentUser}]});
    const {data: {version = gqlVersion.VersionDefault.version} = gqlVersion.VersionDefault} = useQuery<ServerVersion>(
        gqlVersion.Version
    );
    const dashboardsQuery = useQuery<Dashboards>(gqlDashboard.Dashboards);
    const dashboards = (dashboardsQuery.data && dashboardsQuery.data.dashboards) || [];

    const username = (data && data.user && data.user.name) || 'unknown';
    const admin = data && data.user && data.user.admin;

    const drawerLink = (to: string, label: string, icon: React.ReactElement) => (
        <ListItemButton component={Link} to={to} selected={location.pathname === to}>
            <ListItemIcon>{icon}</ListItemIcon>
            <ListItemText primary={label} />
        </ListItemButton>
    );

    const drawer = (
        <div>
            <Box sx={styles.toolbar}>
                <HrefLink href="https://github.com/traggo" underline="none" target="_blank">
                    <Typography variant="h5" align="center" color="textPrimary">
                        traggo
                    </Typography>
                </HrefLink>
                <HrefLink href="https://github.com/traggo/server/releases" underline="none" target="_blank">
                    <Typography variant="subtitle2" align="center" color="textPrimary">
                        {version.name}@{version.commit.slice(0, 8)}
                    </Typography>
                </HrefLink>
            </Box>
            <Divider />
            <List dense={true}>
                {drawerLink('/timesheet/calendar', '我的日志', <CalendarIcon />)}
                {drawerLink('/team', '团队日志', <TeamIcon />)}
            </List>
            <Divider />
            <List dense={true}>{drawerLink('/stats', '统计', <StatsIcon />)}</List>
            <Divider />
            <List subheader={<ListSubheader>其他</ListSubheader>} dense={true}>
                {drawerLink('/timesheet/list', 'List', <TimeLineIcon />)}
                {dashboards.map(({id, name}) => (
                    <ListItemButton key={id} component={Link} to={`/dashboard/${id}/${encodeURIComponent(name)}`}>
                        <ListItemIcon>
                            <DashboardIcon />
                        </ListItemIcon>
                        <ListItemText primary={name} />
                    </ListItemButton>
                ))}
                {drawerLink('/dashboards', 'Manage dashboards', <DashboardManageIcon />)}
                {drawerLink('/user/tags', 'Tags', <LabelIcon />)}
                {drawerLink('/user/devices', 'Devices', <DevicesIcon />)}
                {drawerLink('/user/settings', 'Settings', <SettingsIcon />)}
                {admin ? drawerLink('/admin/users', 'Users', <UsersIcon />) : null}
            </List>
            <Divider />
        </div>
    );

    const navGroups: NavGroup[] = [
        {name: '我的日志', to: '/timesheet/calendar', paths: ['/timesheet/calendar'], items: []},
        {name: '团队日志', to: '/team', paths: ['/team'], items: []},
        {name: '统计', to: '/stats', paths: ['/stats'], items: []},
        {
            name: '其他',
            paths: ['/timesheet/list', '/dashboard', '/user', '/admin'],
            items: [
                {label: 'List', to: '/timesheet/list'},
                ...dashboards.map(({id, name}) => ({label: name, to: `/dashboard/${id}/${encodeURIComponent(name)}`})),
                {label: 'Manage dashboards', to: '/dashboards'},
                {label: 'Tags', to: '/user/tags'},
                {label: 'Devices', to: '/user/devices'},
                {label: 'Settings', to: '/user/settings'},
                ...(admin ? [{label: 'Users', to: '/admin/users'}] : []),
            ],
        },
    ];
    const activeNavGroup = navGroups.find((group) => group.name === (navMenu && navMenu.name));
    const activeNavItems: Array<{label: string; to: string}> = activeNavGroup ? activeNavGroup.items : [];

    return (
        <Box sx={styles.root}>
            <CssBaseline />
            <AppBar position="fixed" enableColorOnDark>
                <Toolbar>
                    <IconButton
                        color="inherit"
                        aria-label="Open drawer"
                        onClick={() => setMobileOpen(!mobileOpen)}
                        sx={styles.menuButton}>
                        <MenuIcon />
                    </IconButton>
                    <Box component={Link} to="/" sx={styles.brand}>
                        <Typography variant="h6" color="inherit" noWrap>
                            traggo
                        </Typography>
                    </Box>
                    <Box sx={styles.desktopOnly}>
                        {navGroups.map(({name, to, paths}) => (
                            <Button
                                key={name}
                                color="inherit"
                                sx={[
                                    styles.navButton,
                                    paths.some((path) => location.pathname.startsWith(path)) && styles.navButtonActive,
                                ]}
                                onClick={(e) => (to ? navigate(to) : setNavMenu({name, anchor: e.currentTarget}))}>
                                {name}
                            </Button>
                        ))}
                        <Menu
                            anchorEl={navMenu && navMenu.anchor}
                            anchorOrigin={{vertical: 'bottom', horizontal: 'left'}}
                            transformOrigin={{vertical: 'top', horizontal: 'left'}}
                            open={!!navMenu}
                            onClose={() => setNavMenu(null)}>
                            {activeNavItems.map(({label, to}) => (
                                <MenuItem
                                    key={to}
                                    selected={location.pathname === to}
                                    onClick={() => setNavMenu(null)}
                                    component={Link}
                                    to={to}>
                                    {label}
                                </MenuItem>
                            ))}
                        </Menu>
                    </Box>
                    <Box sx={styles.mobileOnly}>
                        <Typography variant="h6" color="inherit" noWrap>
                            {pageTitle(location.pathname, dashboards)}
                        </Typography>
                    </Box>
                    <Box sx={styles.grow} />
                    <Box sx={styles.sectionDesktop}>
                        <Button color="inherit" onClick={(e) => setUserMenuOpen(e.currentTarget)}>
                            <AccountCircle />
                            &nbsp;{username}
                        </Button>
                        <Menu
                            anchorEl={userMenuOpen}
                            anchorOrigin={{vertical: 'bottom', horizontal: 'right'}}
                            transformOrigin={{vertical: 'top', horizontal: 'right'}}
                            open={!!userMenuOpen}
                            onClose={() => setUserMenuOpen(null)}>
                            <MenuItem onClick={() => setUserMenuOpen(null)} component={Link} to="/user/settings">
                                Settings
                            </MenuItem>
                            <MenuItem
                                onClick={() => {
                                    setUserMenuOpen(null);
                                    logout();
                                }}>
                                Logout
                            </MenuItem>
                        </Menu>
                    </Box>
                </Toolbar>
            </AppBar>
            <Drawer variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)} sx={styles.drawer}>
                {drawer}
            </Drawer>
            <Box component="main" sx={styles.content}>
                <Box sx={styles.toolbar} />
                {children}
            </Box>
        </Box>
    );
};
