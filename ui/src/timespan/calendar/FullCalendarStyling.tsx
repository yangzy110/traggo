import * as React from 'react';
import Box from '@mui/material/Box';

// Note: all numbers have to be strings with a unit, numbers are interpreted via the theme by `sx` (f.ex. padding: 5 == 40px).
export const FullCalendarStyling: React.FC<React.PropsWithChildren> = ({children}) => (
    <Box
        sx={(theme) => {
            const dark = theme.palette.mode === 'dark';
            return {
                height: '100%',
                width: '100%',

                // FullCalendar is themed via css variables
                '--fc-border-color': dark ? 'rgba(255,255,255,.1)' : 'rgba(0,0,0,.1)',
                '--fc-page-bg-color': theme.palette.background.paper,
                '--fc-today-bg-color': dark ? 'rgba(199,199,199,.1)' : 'rgba(0,0,0,.1)',

                '& .fc-col-header': {
                    fontFamily: 'monospace',
                },
                '& .fc-toolbar': {
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                },
                '& .fc-toolbar-chunk': {
                    display: 'inline-block',
                    verticalAlign: 'middle',
                    textAlign: 'center',
                    boxSizing: 'border-box',
                },
                '& .fc-toolbar-title': {
                    margin: 0,
                    fontSize: '1.5rem',
                },
                '@media (max-width: 600px)': {
                    '& .fc-toolbar': {
                        display: 'inherit',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    },
                    '& .fc-toolbar-chunk': {
                        display: 'block',
                        width: '100%',
                        textAlign: 'center',
                    },
                },

                // every hour has a stronger line, the lines inside of the hour are lighter
                '& .fc-timegrid-slot-lane:not(.fc-timegrid-slot-minor)': {
                    borderTopColor: dark ? 'rgba(255,255,255,.2)' : 'rgba(0,0,0,.2)',
                },

                '& .fc-timegrid-event.fc-v-event.fc-event': {
                    borderRadius: '1px',
                    border: 'none',
                    padding: '5px',
                    opacity: 0.65,
                    margin: '0 5%',
                },
                '& .fc .fc-timegrid-event': {
                    minHeight: '1px',
                },
                '& .fc-event': {
                    fontSize: 'inherit !important',
                    borderRadius: '1px',
                },
                '& .fc-timegrid-event .fc-event-time': {
                    fontWeight: 'normal !important',
                },
                '& .fc .fc-timegrid-event-harness-inset .fc-timegrid-event': {
                    boxShadow: theme.shadows[5],
                },
                '& .fc .fc-event-mirror': {
                    opacity: 0.5,
                },
                '& .fc .fc-timegrid-event:hover': {
                    minHeight: '17px',
                    zIndex: '2 !important',
                },
                '& .fc .fc-timegrid-event.__running': {
                    minHeight: '40px',
                },
                '& .fc .fc-event-main': {
                    height: '100%',
                },
                '& .fc .fc-event-main .stop': {
                    background: dark ? 'rgba(255,255,255,.2) !important' : 'rgba(0,0,0,.1) !important',
                    borderRadius: '6px 0 0 0',
                    fontSize: '10px',
                    width: '50%',
                    padding: '2px 0 1px 0',
                    textAlign: 'center',
                    right: 0,
                    bottom: 0,
                    position: 'absolute',
                    display: 'inline-block',
                },
                '& .fc .fc-event-main .stop:hover': {
                    background: dark ? 'rgba(255,255,255,.3) !important' : 'rgba(0,0,0,.2) !important',
                },
                '& .fc .fc-event-main .stop a': {
                    width: '100%',
                    display: 'block',
                    cursor: 'pointer',
                },
                '& .fc .fc-timegrid-now-indicator-line, & .fc .fc-timegrid-now-indicator-arrow': {
                    zIndex: 5,
                },
                '& .fc .ellipsis': {
                    display: '-webkit-box',
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                },
                '& .fc .ellipsis-single': {
                    textOverflow: 'ellipsis',
                    display: 'inline-block',
                    width: '100%',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                },
                '& .fc .__start': {
                    background: theme.palette.primary.main,
                    color: theme.palette.primary.contrastText,
                    border: 0,
                    borderRadius: '0 0 10px 10px',
                    textAlign: 'center',
                    boxShadow: theme.shadows[1],
                    cursor: 'pointer',
                },
                '& .fc .__start:hover': {
                    background: theme.palette.primary.light,
                },

                '& .fc .fc-button': {
                    display: 'inline-block',
                    position: 'relative',
                    cursor: 'pointer',
                    minHeight: '36px',
                    minWidth: '88px',
                    lineHeight: '36px',
                    verticalAlign: 'middle',
                    alignItems: 'center',
                    textAlign: 'center',
                    borderRadius: '2px',
                    boxSizing: 'border-box',
                    userSelect: 'none',
                    outline: 'none',
                    padding: '0 6px',
                    margin: '6px 8px',
                    letterSpacing: '.01em',
                    background: 'transparent',
                    color: 'currentColor',
                    whiteSpace: 'nowrap',
                    textTransform: 'uppercase',
                    fontWeight: '500',
                    fontSize: '14px',
                    fontStyle: 'inherit',
                    fontVariant: 'inherit',
                    fontFamily: 'inherit',
                    textDecoration: 'none',
                    overflow: 'hidden',
                    borderColor: theme.palette.primary.main,
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    transition: 'box-shadow .4s cubic-bezier(.25,.8,.25,1),background-color .4s cubic-bezier(.25,.8,.25,1)',
                },
                '& .fc .fc-button-primary:not(:disabled).fc-button-active, & .fc .fc-button-primary:not(:disabled):active': {
                    backgroundColor: theme.palette.primary.main + ' !important',
                    color: theme.palette.primary.contrastText,
                },
            };
        }}>
        {children}
    </Box>
);
