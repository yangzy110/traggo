import * as React from 'react';
import Box from '@mui/material/Box';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import CalendarIcon from '@mui/icons-material/CalendarMonth';
import ListIcon from '@mui/icons-material/ViewList';
import {useNavigate} from 'react-router-dom';

export type TimesheetView = 'calendar' | 'list';

const STORAGE_KEY = 'traggo.timesheet.view';

// The view which was used the last time is opened by default.
export const lastTimesheetView = (): TimesheetView => (window.localStorage.getItem(STORAGE_KEY) === 'list' ? 'list' : 'calendar');

interface TimesheetLayoutProps {
    view: TimesheetView;
    // the navigation of the calendar, next to the switch of the views
    nav?: React.ReactNode;
    // buttons at the right edge
    actions?: React.ReactNode;
}

// The frame of "My log": the switch between the calendar and the list and the content below of it.
// All four edges are set, therefore the size does not depend on the content. The left and right edge match the
// padding of the page, the top edge is below the app bar.
export const TimesheetLayout: React.FC<React.PropsWithChildren<TimesheetLayoutProps>> = ({view, nav, actions, children}) => {
    const navigate = useNavigate();
    React.useEffect(() => {
        window.localStorage.setItem(STORAGE_KEY, view);
    }, [view]);

    return (
        <Box
            sx={{
                position: 'absolute',
                top: '80px',
                bottom: '10px',
                left: {xs: '8px', md: '24px'},
                right: {xs: '8px', md: '24px'},
                display: 'flex',
                flexDirection: 'column',
            }}>
            <Box sx={{display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', marginBottom: 1.5}}>
                <ToggleButtonGroup
                    exclusive
                    size="small"
                    color="primary"
                    value={view}
                    aria-label="视图"
                    onChange={(_, value: TimesheetView | null) => value && navigate(`/timesheet/${value}`)}>
                    <ToggleButton value="calendar" sx={{paddingLeft: 1.5, paddingRight: 1.5}}>
                        <CalendarIcon fontSize="small" sx={{marginRight: 0.75}} />
                        日历
                    </ToggleButton>
                    <ToggleButton value="list" sx={{paddingLeft: 1.5, paddingRight: 1.5}}>
                        <ListIcon fontSize="small" sx={{marginRight: 0.75}} />
                        列表
                    </ToggleButton>
                </ToggleButtonGroup>
                {nav}
                <Box sx={{flexGrow: 1}} />
                <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>{actions}</Box>
            </Box>
            <Box sx={{flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column'}}>{children}</Box>
        </Box>
    );
};
