import * as React from 'react';
import Box from '@mui/material/Box';
import {alpha} from '@mui/material/styles';

// Note: all numbers have to be strings with a unit, numbers are interpreted via the theme by `sx` (f.ex. padding: 5 == 40px).
export const FullCalendarStyling: React.FC<React.PropsWithChildren> = ({children}) => (
    <Box
        sx={(theme) => {
            const dark = theme.palette.mode === 'dark';
            const primary = theme.palette.primary;
            const hourLine = dark ? 'rgba(255,255,255,.14)' : 'rgba(15,23,42,.14)';
            return {
                height: '100%',
                width: '100%',

                // FullCalendar is themed via css variables
                '--fc-border-color': theme.palette.divider,
                '--fc-page-bg-color': theme.palette.background.paper,
                '--fc-today-bg-color': alpha(primary.main, dark ? 0.1 : 0.05),
                '--fc-now-indicator-color': theme.palette.error.main,

                '& .fc': {fontFamily: 'inherit'},
                '& .fc-col-header-cell-cushion': {
                    fontWeight: 800,
                    fontSize: '1.05rem',
                    color: theme.palette.text.primary,
                    padding: '12px 4px',
                },
                '& .fc-day-today .fc-col-header-cell-cushion': {color: primary.main},
                // taller rows, the larger text of the blocks has to fit into a quarter of an hour
                '& .fc .fc-timegrid-slot': {height: '2.2rem'},
                '& .fc-timegrid-slot-label-cushion': {
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    color: theme.palette.text.secondary,
                },
                '& .fc-toolbar': {
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                },
                '& .fc-toolbar-chunk': {
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    verticalAlign: 'middle',
                    textAlign: 'center',
                    boxSizing: 'border-box',
                },
                '& .fc-toolbar-title': {
                    margin: 0,
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    letterSpacing: '-0.01em',
                },
                // on small screens the parts of the toolbar are stacked
                '@media (max-width: 600px)': {
                    '& .fc-header-toolbar': {
                        flexDirection: 'column',
                        alignItems: 'stretch',
                        gap: '8px',
                    },
                    '& .fc-toolbar-chunk': {
                        display: 'flex',
                        justifyContent: 'center',
                        flexWrap: 'wrap',
                    },
                    '& .fc-toolbar-title': {fontSize: '1.05rem'},
                    '& .fc-col-header-cell-cushion': {padding: '8px 0'},
                },

                // every hour has a stronger line, the lines inside of the hour are lighter
                '& .fc-timegrid-slot-lane:not(.fc-timegrid-slot-minor)': {
                    borderTopColor: hourLine,
                },
                '& .fc-scrollgrid': {borderColor: theme.palette.divider, borderRadius: '10px', overflow: 'hidden'},

                // events
                '& .fc-timegrid-event.fc-v-event.fc-event': {
                    borderRadius: '8px',
                    borderStyle: 'solid',
                    borderWidth: '0 0 0 4px',
                    padding: '4px 6px',
                    margin: '0 2px',
                    boxShadow: 'none',
                },
                '& .fc .fc-timegrid-event': {
                    minHeight: '1px',
                },
                '& .fc-event': {
                    fontSize: 'inherit !important',
                    borderRadius: '8px',
                },
                '& .fc-timegrid-event .fc-event-time': {
                    fontWeight: 'normal !important',
                },
                '& .fc .fc-timegrid-event-harness-inset .fc-timegrid-event': {
                    boxShadow: theme.shadows[6],
                },
                '& .fc .fc-event-mirror': {
                    opacity: 0.5,
                },
                '& .fc .fc-timegrid-event:hover': {
                    minHeight: '17px',
                    zIndex: '2 !important',
                },
                // handles at the top and the bottom edge which are shown on hover: the edges can be dragged
                '& .fc-timegrid-event .fc-event-resizer': {left: 0, right: 0, height: '10px', cursor: 'ns-resize'},
                '& .fc-timegrid-event .fc-event-resizer::after': {
                    content: '""',
                    position: 'absolute',
                    left: '50%',
                    width: '28px',
                    height: '3px',
                    marginLeft: '-14px',
                    borderRadius: '2px',
                    background: theme.palette.text.secondary,
                    opacity: 0,
                    transition: 'opacity .15s',
                },
                '& .fc-timegrid-event .fc-event-resizer-start::after': {top: '3px'},
                '& .fc-timegrid-event .fc-event-resizer-end::after': {bottom: '3px'},
                '& .fc-timegrid-event:hover .fc-event-resizer::after': {opacity: 1},
                '& .fc-daygrid-event': {margin: '1px 2px', cursor: 'pointer', fontSize: '0.9rem'},
                '& .fc-daygrid-day': {cursor: 'pointer'},
                '& .fc .fc-event-main': {
                    overflow: 'hidden',
                    height: '100%',
                    fontSize: '1rem',
                    lineHeight: 1.3,
                },
                '& .fc .fc-event-main .stop': {
                    background: 'rgba(0,0,0,.28) !important',
                    color: '#fff',
                    borderRadius: '8px 0 6px 0',
                    fontSize: '10px',
                    fontWeight: 600,
                    width: '50%',
                    padding: '2px 0 2px 0',
                    textAlign: 'center',
                    right: 0,
                    bottom: 0,
                    position: 'absolute',
                    display: 'inline-block',
                },
                '& .fc .fc-event-main .stop:hover': {
                    background: 'rgba(0,0,0,.42) !important',
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
                '& .fc .note': {opacity: 0.95, fontSize: '0.95rem'},
                '& .fc .time': {fontWeight: 700},
                '& .fc .pills': {display: 'flex', flexWrap: 'wrap', gap: '3px', overflow: 'hidden', margin: '2px 0'},
                '& .fc .ellipsis-single .pills': {display: 'inline-flex', flexWrap: 'nowrap', verticalAlign: 'middle'},
                '& .fc .pill': {
                    borderRadius: '10px',
                    padding: '0 6px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    lineHeight: 1.5,
                    whiteSpace: 'nowrap',
                },
                '& .fc .ellipsis-single': {
                    textOverflow: 'ellipsis',
                    display: 'inline-block',
                    width: '100%',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                },
                '& .fc .__start': {
                    background: primary.main,
                    color: primary.contrastText,
                    border: 0,
                    borderRadius: '8px',
                    textAlign: 'center',
                    fontWeight: 600,
                    boxShadow: theme.shadows[2],
                    cursor: 'pointer',
                },
                '& .fc .__start:hover': {
                    background: primary.dark,
                },

                // buttons: flat, rounded and connected inside of a group
                '& .fc .fc-button': {
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    cursor: 'pointer',
                    minHeight: '36px',
                    minWidth: '36px',
                    verticalAlign: 'middle',
                    textAlign: 'center',
                    borderRadius: '8px',
                    boxSizing: 'border-box',
                    userSelect: 'none',
                    outline: 'none',
                    padding: '0 14px',
                    margin: 0,
                    background: theme.palette.background.paper,
                    color: theme.palette.text.primary,
                    whiteSpace: 'nowrap',
                    textTransform: 'none',
                    fontWeight: '600',
                    fontSize: '0.875rem',
                    fontStyle: 'inherit',
                    fontVariant: 'inherit',
                    fontFamily: 'inherit',
                    textDecoration: 'none',
                    borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.23)' : 'rgba(0,0,0,0.18)',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    transition: 'background-color .15s, border-color .15s, box-shadow .15s',
                },
                '& .fc .fc-button:hover': {
                    background: theme.palette.action.hover,
                    borderColor: theme.palette.text.secondary,
                },
                '& .fc .fc-button:focus-visible': {
                    boxShadow: `0 0 0 3px ${alpha(primary.main, 0.3)}`,
                },
                '& .fc .fc-button:disabled': {opacity: 0.45, cursor: 'default'},
                '& .fc .fc-button-group': {display: 'inline-flex'},
                '& .fc .fc-button-group > .fc-button': {borderRadius: 0, marginLeft: '-1px'},
                '& .fc .fc-button-group > .fc-button:first-of-type': {
                    borderTopLeftRadius: '8px',
                    borderBottomLeftRadius: '8px',
                    marginLeft: 0,
                },
                '& .fc .fc-button-group > .fc-button:last-of-type': {
                    borderTopRightRadius: '8px',
                    borderBottomRightRadius: '8px',
                },
                '& .fc .fc-button-primary:not(:disabled).fc-button-active, & .fc .fc-button-primary:not(:disabled):active': {
                    background: primary.main + ' !important',
                    borderColor: primary.main + ' !important',
                    color: primary.contrastText + ' !important',
                    zIndex: 1,
                },
            };
        }}>
        {children}
    </Box>
);
