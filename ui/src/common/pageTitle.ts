import {matchPath} from 'react-router-dom';

const pageTitles: Array<[path: string, title: string]> = [
    ['/team', '团队日志'],
    ['/team/:userId', '团队日志 / 成员'],
    ['/stats', '统计'],
    ['/timesheet/list', '我的日志 / 列表'],
    ['/timesheet/calendar', '我的日志 / 日历'],
    ['/user/settings', '设置'],
    ['/user/tags', '标签'],
    ['/admin/users', '用户管理'],
    ['/dashboards', '管理仪表盘'],
];

export const pageTitle = (pathname: string, dashboards: Array<{id: number; name: string}>): string => {
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
