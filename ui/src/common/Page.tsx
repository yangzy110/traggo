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
import LogoutIcon from '@mui/icons-material/Logout';
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
import {lastTimesheetView} from '../timespan/TimesheetLayout';

const drawerWidth = 240;

// The menu of the dashboards is hidden for now, the pages are still reachable by their url.
const SHOW_DASHBOARDS = false;

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
        marginRight: theme.spacing(0.5),
        padding: theme.spacing(0.75, 1.75),
        fontSize: '0.95rem',
        fontWeight: 500,
        borderRadius: '8px',
        opacity: 0.8,
        '&:hover': {opacity: 1, backgroundColor: 'action.hover'},
    }),
    navButtonActive: {
        opacity: 1,
        fontWeight: 600,
        backgroundColor: 'action.selected',
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
    ['/timesheet/list', '我的日志 / 列表'],
    ['/timesheet/calendar', '我的日志 / 日历'],
    ['/user/settings', '设置'],
    ['/user/devices', '设备'],
    ['/user/tags', '标签'],
    ['/admin/users', '用户管理'],
    ['/dashboards', '管理仪表盘'],
];

const pageTitle = (pathname: string, dashboards: Array<{id: number; name: string}>): string => {
    const known = pageTitles.find(([path]) => matchPath(path, pathname));
    if (known) {
        return known[1];
    }
    const dashboardMatch = matchPath('/dashboard/:id/*', pathname);
    if (dashboardMatch) {
        const dashboard = dashboards.find((db) => '' + db.id === dashboardMatch.params.id);
        return '仪表盘 / ' + (dashboard ? dashboard.name : '...');
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

    const drawerLink = (to: string, label: string, icon: React.ReactElement, selected = location.pathname === to) => (
        <ListItemButton component={Link} to={to} selected={selected}>
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
                {drawerLink(
                    `/timesheet/${lastTimesheetView()}`,
                    '我的日志',
                    <CalendarIcon />,
                    location.pathname.startsWith('/timesheet')
                )}
                {drawerLink('/team', '团队日志', <TeamIcon />)}
                {drawerLink('/stats', '统计', <StatsIcon />)}
            </List>
            <Divider />
            {SHOW_DASHBOARDS ? (
                <>
                    <List subheader={<ListSubheader>仪表盘</ListSubheader>} dense={true}>
                        {dashboards.map(({id, name}) => (
                            <ListItemButton key={id} component={Link} to={`/dashboard/${id}/${encodeURIComponent(name)}`}>
                                <ListItemIcon>
                                    <DashboardIcon />
                                </ListItemIcon>
                                <ListItemText primary={name} />
                            </ListItemButton>
                        ))}
                        {drawerLink('/dashboards', '管理仪表盘', <DashboardManageIcon />)}
                    </List>
                    <Divider />
                </>
            ) : null}
            <List subheader={<ListSubheader>账号</ListSubheader>} dense={true}>
                {drawerLink('/user/tags', '标签', <LabelIcon />)}
                {drawerLink('/user/devices', '设备', <DevicesIcon />)}
                {drawerLink('/user/settings', '设置', <SettingsIcon />)}
                {admin ? drawerLink('/admin/users', '用户管理', <UsersIcon />) : null}
                <ListItemButton onClick={() => logout()}>
                    <ListItemIcon>
                        <LogoutIcon />
                    </ListItemIcon>
                    <ListItemText primary="退出登录" />
                </ListItemButton>
            </List>
            <Divider />
        </div>
    );

    const navGroups: NavGroup[] = [
        {name: '我的日志', to: `/timesheet/${lastTimesheetView()}`, paths: ['/timesheet'], items: []},
        {name: '团队日志', to: '/team', paths: ['/team'], items: []},
        {name: '统计', to: '/stats', paths: ['/stats'], items: []},
        ...(SHOW_DASHBOARDS
            ? [
                  {
                      name: '仪表盘',
                      paths: ['/dashboard'],
                      items: [
                          ...dashboards.map(({id, name}) => ({label: name, to: `/dashboard/${id}/${encodeURIComponent(name)}`})),
                          {label: '管理仪表盘', to: '/dashboards'},
                      ],
                  },
              ]
            : []),
    ];
    // the pages of the account are in the menu of the user
    const userMenuItems = [
        {label: '标签', to: '/user/tags', icon: <LabelIcon fontSize="small" />},
        {label: '设备', to: '/user/devices', icon: <DevicesIcon fontSize="small" />},
        {label: '设置', to: '/user/settings', icon: <SettingsIcon fontSize="small" />},
        ...(admin ? [{label: '用户管理', to: '/admin/users', icon: <UsersIcon fontSize="small" />}] : []),
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
                        aria-label="打开菜单"
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
                        <Button color="inherit" aria-label="账号菜单" onClick={(e) => setUserMenuOpen(e.currentTarget)}>
                            <AccountCircle />
                            <Box component="span" sx={{display: {xs: 'none', sm: 'inline'}, ml: 1}}>
                                {username}
                            </Box>
                        </Button>
                        <Menu
                            anchorEl={userMenuOpen}
                            anchorOrigin={{vertical: 'bottom', horizontal: 'right'}}
                            transformOrigin={{vertical: 'top', horizontal: 'right'}}
                            open={!!userMenuOpen}
                            onClose={() => setUserMenuOpen(null)}>
                            {userMenuItems.map(({label, to, icon}) => (
                                <MenuItem
                                    key={to}
                                    selected={location.pathname === to}
                                    onClick={() => setUserMenuOpen(null)}
                                    component={Link}
                                    to={to}>
                                    <ListItemIcon>{icon}</ListItemIcon>
                                    {label}
                                </MenuItem>
                            ))}
                            <Divider />
                            <MenuItem
                                onClick={() => {
                                    setUserMenuOpen(null);
                                    logout();
                                }}>
                                <ListItemIcon>
                                    <LogoutIcon fontSize="small" />
                                </ListItemIcon>
                                退出登录
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
