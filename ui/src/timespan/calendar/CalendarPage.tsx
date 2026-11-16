import * as React from 'react';
import {Paper, useTheme} from '@mui/material';
import moment from 'moment';
import {useApolloClient, useMutation, useQuery} from '@apollo/client/react';
import {
    TimeSpans_timeSpans_timeSpans,
    Trackers,
    Tags,
    UpdateTimeSpan,
    UpdateTimeSpanVariables,
    AddTimeSpan,
    AddTimeSpanVariables,
    StopTimer,
    StopTimerVariables,
    StartTimer,
    StartTimerVariables,
    TimeSpansInRange,
    TimeSpansInRangeVariables,
    InputCursor,
    TimeSpansForExport,
    TimeSpansForExportVariables,
} from '../../gql/types';
import * as gqlTimeSpan from '../../gql/timeSpan';
import * as gqlTag from '../../gql/tags';
import FullCalendar from '@fullcalendar/react';
import {calculateColor, ColorMode} from '../colorutils';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type {CalendarOptions, EventApi, EventInput} from '@fullcalendar/core';
import Popper from '@mui/material/Popper';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import {TimeSpan} from '../TimeSpan';
import {toTagSelectorEntry} from '../../tag/tagSelectorEntry';
import {FullCalendarStyling} from './FullCalendarStyling';
import {useInterval} from '../../utils/hooks';
import {
    addTimeSpanInRangeToCache,
    addTimeSpanToCache,
    removeFromTimeSpanInRangeCache,
    removeFromTrackersCache,
} from '../../gql/utils';
import {timeRunningCalendar} from '../timeutils';
import {stripTypename} from '../../utils/strip';
import {useSnackbar} from 'notistack';
import {DAY_FORMAT, exportLog, LogEntry} from '../teamutils';

// The server returns at most 100 time spans per request, so the export has to page through the range.
const MAX_EXPORT_PAGES = 200;

const toMoment = (date: Date): moment.Moment => {
    return moment(date).tz('utc');
};

const StartTimerId = '-1';

export const CalendarPage: React.FC = () => {
    const apollo = useApolloClient();
    const theme = useTheme();
    const timeSpansResult = useQuery<TimeSpansInRange, TimeSpansInRangeVariables>(gqlTimeSpan.TimeSpansInRange, {
        variables: {
            start: moment().startOf('week').format(),
            end: moment().endOf('week').format(),
        },
        fetchPolicy: 'cache-and-network',
    });
    const trackersResult = useQuery<Trackers>(gqlTimeSpan.Trackers, {fetchPolicy: 'cache-and-network'});
    const {enqueueSnackbar} = useSnackbar();
    const tagsResult = useQuery<Tags>(gqlTag.Tags);
    const [startTimer] = useMutation<StartTimer, StartTimerVariables>(gqlTimeSpan.StartTimer, {
        refetchQueries: [{query: gqlTimeSpan.Trackers}],
    });
    const [updateTimeSpanMutation] = useMutation<UpdateTimeSpan, UpdateTimeSpanVariables>(gqlTimeSpan.UpdateTimeSpan);
    const [currentDate, setCurrentDate] = React.useState(moment());
    const [stopTimer] = useMutation<StopTimer, StopTimerVariables>(gqlTimeSpan.StopTimer, {
        update: (cache, {data}) => {
            if (!data || !data.stopTimeSpan) {
                return;
            }
            removeFromTrackersCache(cache, data);
            addTimeSpanInRangeToCache(cache, data.stopTimeSpan, timeSpansResult.variables);
        },
    });
    useInterval(
        () => {
            setCurrentDate(moment());
        },
        60000,
        true
    );
    const [ignore, setIgnore] = React.useState<boolean>(false);
    const [selected, setSelected] = React.useState<{selected: HTMLElement | null; data: TimeSpans_timeSpans_timeSpans | null}>({
        selected: null,
        data: null,
    });
    const [addTimeSpan] = useMutation<AddTimeSpan, AddTimeSpanVariables>(gqlTimeSpan.AddTimeSpan, {
        update: (cache, {data}) => {
            if (!data || !data.createTimeSpan) {
                return;
            }
            addTimeSpanInRangeToCache(cache, data.createTimeSpan, timeSpansResult.variables);
            addTimeSpanToCache(cache, data.createTimeSpan);
        },
    });

    // Exports all finished time spans of the range which is currently visible in the calendar.
    const exportCsv = async () => {
        const {start, end} = timeSpansResult.variables;
        const entries: LogEntry[] = [];
        try {
            let cursor: InputCursor | null = null;
            for (let page = 0; page < MAX_EXPORT_PAGES; page++) {
                const result = await apollo.query<TimeSpansForExport, TimeSpansForExportVariables>({
                    query: gqlTimeSpan.TimeSpansForExport,
                    variables: {start, end, cursor},
                    fetchPolicy: 'network-only',
                });
                if (!result.data) {
                    throw result.error || new Error('no data received');
                }
                const paged = result.data.timeSpans;
                paged.timeSpans.forEach((ts) =>
                    entries.push({member: '', start: ts.start, end: ts.end, tags: ts.tags, note: ts.note})
                );
                if (!paged.cursor.hasMore || paged.timeSpans.length === 0) {
                    break;
                }
                cursor = {startId: paged.cursor.startId, offset: paged.cursor.offset, pageSize: paged.cursor.pageSize};
            }
        } catch (e) {
            enqueueSnackbar('导出失败: ' + (e instanceof Error ? e.message : String(e)), {variant: 'error'});
            return;
        }
        if (entries.length === 0) {
            enqueueSnackbar('当前时间范围内没有记录可导出', {variant: 'info'});
            return;
        }
        entries.sort((a, b) => moment(a.start).diff(moment(b.start)));
        const from = moment(start).format(DAY_FORMAT);
        const to = moment(end).subtract(1, 'millisecond').format(DAY_FORMAT);
        exportLog(`traggo-my-log_${from}_${to}.csv`, entries, false);
    };
    const exportRef = React.useRef(exportCsv);
    exportRef.current = exportCsv;

    const values: EventInput[] = (() => {
        if (
            timeSpansResult.error ||
            timeSpansResult.loading ||
            !timeSpansResult.data ||
            timeSpansResult.data.timeSpans === null ||
            trackersResult.error ||
            trackersResult.loading ||
            !trackersResult.data ||
            trackersResult.data.timers === null ||
            tagsResult.error ||
            tagsResult.loading ||
            !tagsResult.data ||
            tagsResult.data.tags === null
        ) {
            return [];
        }
        return timeSpansResult.data.timeSpans.timeSpans
            .concat(trackersResult.data.timers)
            .sort((a, b) => a.start.toString().localeCompare(b.start.toString()))
            .map((ts) => {
                const colorKey = ts
                    .tags!.map((t) => t.key + ':' + t.value)
                    .sort((a, b) => a.localeCompare(b))
                    .join(' ');
                const color = calculateColor(colorKey, ColorMode.Bold, theme.palette.mode);
                const borderColor = calculateColor(colorKey, ColorMode.None, theme.palette.mode);
                return {
                    start: moment(ts.start).toDate(),
                    end: moment(ts.end || currentDate).toDate(),
                    editable: !!ts.end,
                    classNames: ts.end ? [] : ['__running'],
                    backgroundColor: color,
                    startEditable: true,
                    id: ts.id,
                    title: ts.tags!.map((t) => t.key + ':' + t.value).join(' '),
                    extendedProps: {ts},
                    textColor: theme.palette.getContrastText(color),
                    borderColor,
                };
            });
    })();

    const onDrop: CalendarOptions['eventDrop'] = (data) => {
        updateTimeSpanMutation({
            variables: {
                oldStart: moment(data.oldEvent.start!).format(),
                start: moment(data.event.start!).format(),
                end: moment(data.event.end!).format(),
                id: parseInt(data.event.id, 10),
                tags: stripTypename(data.event.extendedProps.ts.tags),
                note: data.event.extendedProps.ts.note,
            },
        });
    };
    const onResize: CalendarOptions['eventResize'] = (data) => {
        updateTimeSpanMutation({
            variables: {
                oldStart: moment(data.oldEvent.start!).format(),
                start: moment(data.event.start!).format(),
                end: moment(data.event.end!).format(),
                id: parseInt(data.event.id, 10),
                tags: stripTypename(data.event.extendedProps.ts.tags),
                note: data.event.extendedProps.ts.note,
            },
        });
    };
    const onSelect: CalendarOptions['select'] = (data) => {
        addTimeSpan({
            variables: {
                start: moment(data.start).format(),
                end: moment(data.end).format(),
                tags: [],
                note: '',
            },
        });
    };
    const onClick: CalendarOptions['eventClick'] = (data) => {
        data.jsEvent.preventDefault();
        if (data.event.id === StartTimerId) {
            startTimer({variables: {start: moment().format(), tags: [], note: ''}}).then(() => {
                setCurrentDate(moment());
            });
            return;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setSelected({data: data.event.extendedProps.ts, selected: data.jsEvent.target as any});
    };
    if (trackersResult.data && !(trackersResult.data.timers || []).length) {
        const startTimerEvent: EventInput = {
            start: currentDate.toDate(),
            end: moment(currentDate).add(15, 'minute').toDate(),
            classNames: ['__start'],
            editable: false,
            id: StartTimerId,
        };
        values.push(startTimerEvent);
    }

    return (
        <Paper style={{padding: 10, bottom: 10, top: 80, position: 'absolute'}} color="red">
            <FullCalendarStyling>
                <FullCalendar
                    initialView="timeGridWeek"
                    rerenderDelay={30}
                    datesSet={(x) => {
                        const range = {
                            start: moment(x.view.currentStart).format(),
                            end: moment(x.view.currentEnd).format(),
                        };
                        if (
                            !moment(timeSpansResult.variables.start).isSame(range.start) ||
                            !moment(timeSpansResult.variables.end).isSame(range.end)
                        ) {
                            timeSpansResult.refetch(range);
                        }
                    }}
                    views={{
                        timeGrid5Day: {
                            type: 'timeGrid',
                            duration: {days: 7},
                            buttonText: '5 day',
                            hiddenDays: [0, 6],
                        },
                    }}
                    editable={true}
                    events={values}
                    allDaySlot={false}
                    selectable={true}
                    selectMirror={true}
                    handleWindowResize={true}
                    height={'parent'}
                    selectMinDistance={20}
                    now={currentDate.toDate()}
                    defaultTimedEventDuration={{minute: 15}}
                    eventContent={(arg) => (
                        <EventContent
                            event={arg.event}
                            stop={() => {
                                stopTimer({variables: {id: arg.event.extendedProps.ts.id, end: moment().format()}});
                            }}
                        />
                    )}
                    slotLabelInterval={{minute: 60}}
                    slotDuration={{minute: 15}}
                    scrollTime={{hour: 6, minute: 30}}
                    select={onSelect}
                    firstDay={moment.localeData().firstDayOfWeek()}
                    eventResize={onResize}
                    eventClick={onClick}
                    eventDrop={onDrop}
                    slotLabelFormat={(s) => toMoment(s.date.marker).format('LT')}
                    dayHeaderFormat={(s) => toMoment(s.date.marker).format('DD ddd')}
                    nowIndicator={true}
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                    customButtons={{
                        export: {
                            text: '导出 CSV',
                            click: () => exportRef.current(),
                        },
                    }}
                    headerToolbar={{
                        center: 'title',
                        left: 'prev,next today',
                        right: 'export timeGridWeek,timeGrid5Day,timeGridDay',
                    }}
                />
            </FullCalendarStyling>
            {!!selected.selected && (
                <Popper open={true} anchorEl={selected.selected} style={{zIndex: 1200, maxWidth: 700}}>
                    <ClickAwayListener
                        onClickAway={() => {
                            if (ignore) {
                                return;
                            }
                            setSelected({selected: null, data: null});
                        }}>
                        <div>
                            <TimeSpan
                                elevation={10}
                                id={selected.data!.id}
                                key={selected.data!.id}
                                rangeChange={(range) => {
                                    setSelected({
                                        ...selected,
                                        data: {...selected.data!, start: range.from.format(), end: range.to && range.to.format()},
                                    });
                                }}
                                deleted={() => {
                                    removeFromTimeSpanInRangeCache(apollo.cache, selected.data!.id, timeSpansResult.variables);
                                    setSelected({selected: null, data: null});
                                }}
                                continued={() => setCurrentDate(moment())}
                                range={{
                                    from: moment(selected.data!.start),
                                    to: selected.data!.end ? moment(selected.data!.end) : undefined,
                                }}
                                initialTags={toTagSelectorEntry(
                                    tagsResult.data!.tags!,
                                    selected.data!.tags!.map((tag) => ({key: tag.key, value: tag.value}))
                                )}
                                note={selected.data!.note}
                                dateSelectorOpen={setIgnore}
                                stopped={() => {
                                    setSelected({
                                        ...selected,
                                        data: {...selected.data!, end: currentDate.toDate()},
                                    });
                                }}
                            />
                        </div>
                    </ClickAwayListener>
                </Popper>
            )}
        </Paper>
    );
};

const EventContent: React.FC<{event: EventApi; stop: () => void}> = ({event, stop}) => {
    if (!event.start || !event.end) {
        return null;
    }

    if (event.id === StartTimerId) {
        return <>START</>;
    }

    const start = moment(event.start);
    const end = moment(event.end);
    const lines = Math.floor(end.diff(start, 'minute') / 15);
    const hasEnd = !event.extendedProps.ts || !!event.extendedProps.ts.end;

    const stopButton = hasEnd ? null : (
        <div className="stop">
            <a
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    stop();
                }}>
                STOP {timeRunningCalendar(start, end)}
            </a>
        </div>
    );
    const clamp = (amount: number) => (
        <span className="ellipsis" title={event.title} style={{WebkitLineClamp: amount}}>
            {event.title}
        </span>
    );
    const single = (
        <span className="ellipsis-single" title={event.title}>
            {event.title}
        </span>
    );

    const date = (
        <>
            {start.format('LT')} - {hasEnd ? end.format('LT') : 'now'}{' '}
            {hasEnd ? <span style={{float: 'right'}}>{timeRunningCalendar(start, end)}</span> : null}
        </>
    );
    if (lines < 2) {
        return (
            <>
                {event.title ? single : date}
                {stopButton}
            </>
        );
    }
    if (lines === 2) {
        return hasEnd ? (
            <>
                {date}
                {single}
                {stopButton}
            </>
        ) : (
            <>
                {clamp(2)}
                {stopButton}
            </>
        );
    }

    return (
        <>
            {date}
            <br />
            {clamp(lines - 1)}
            {stopButton}
        </>
    );
};
