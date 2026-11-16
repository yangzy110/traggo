import * as React from 'react';
import {Paper, useTheme} from '@mui/material';
import {alpha} from '@mui/material/styles';
import bestContrast from 'get-best-contrast-color';
import {ExportCsvButton} from '../../common/ExportCsvButton';
import moment from 'moment';
import {useApolloClient, useQuery} from '@apollo/client/react';
import {Tags} from '../../gql/types';
import * as gqlTag from '../../gql/tags';
import FullCalendar from '@fullcalendar/react';
import {calculateColor, ColorMode} from '../colorutils';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import zhCnLocale from '@fullcalendar/core/locales/zh-cn';
import type {CalendarOptions, EventApi, EventInput} from '@fullcalendar/core';
import type {PopperProps} from '@mui/material/Popper';
import {toTagSelectorEntry} from '../../tag/tagSelectorEntry';
import {EDITOR_CLASS, TimeSpanEditor} from '../TimeSpanEditor';
import {TimesheetLayout} from '../TimesheetLayout';
import {useTimeSpanMutations} from '../useTimeSpanMutations';
import {FullCalendarStyling} from './FullCalendarStyling';
import {stripTypename} from '../../utils/strip';
import {useSnackbar} from 'notistack';
import {DAY_FORMAT, exportLog, LogEntry} from '../teamutils';
import {fetchAllTimeSpans, TimeSpanItem} from '../fetchTimeSpans';

const toMoment = (date: Date): moment.Moment => {
    return moment(date).tz('utc');
};

// The editor is shown below the end of a selection (to create a time span) or below an event (to change a time span).
type Editor =
    | {mode: 'create'; anchor: PopperProps['anchorEl']; start: Date; end: Date; unselect: () => void}
    | {mode: 'edit'; anchor: PopperProps['anchorEl']; ts: TimeSpanItem};

export const CalendarPage: React.FC = () => {
    const apollo = useApolloClient();
    const theme = useTheme();
    const {enqueueSnackbar} = useSnackbar();
    const tagsResult = useQuery<Tags>(gqlTag.Tags);
    const [range, setRange] = React.useState(() => ({
        start: moment().startOf('week').format(),
        end: moment().endOf('week').format(),
    }));
    const [timeSpans, setTimeSpans] = React.useState<TimeSpanItem[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [reload, setReload] = React.useState(0);
    const [view, setView] = React.useState('timeGridWeek');
    const [editor, setEditor] = React.useState<Editor | null>(null);
    const mutations = useTimeSpanMutations(() => setReload((n) => n + 1));

    React.useEffect(() => {
        let cancelled = false;
        setLoading(true);
        fetchAllTimeSpans(apollo, range.start, range.end)
            .then((items) => !cancelled && setTimeSpans(items))
            .catch((e) => enqueueSnackbar('加载失败: ' + (e instanceof Error ? e.message : String(e)), {variant: 'error'}))
            .finally(() => !cancelled && setLoading(false));
        return () => {
            cancelled = true;
        };
    }, [apollo, range.start, range.end, reload, enqueueSnackbar]);

    // Exports all time spans of the range which is currently visible in the calendar.
    const exportCsv = async () => {
        const {start, end} = range;
        const entries: LogEntry[] = timeSpans.map((ts) => ({
            member: '',
            start: ts.start,
            end: ts.end,
            tags: ts.tags,
            note: ts.note,
        }));
        if (entries.length === 0) {
            enqueueSnackbar('当前时间范围内没有记录可导出', {variant: 'info'});
            return;
        }
        entries.sort((a, b) => moment(a.start).diff(moment(b.start)));
        const from = moment(start).format(DAY_FORMAT);
        const to = moment(end).subtract(1, 'millisecond').format(DAY_FORMAT);
        exportLog(`traggo-my-log_${from}_${to}.csv`, entries, false);
    };

    const ready = !loading && !tagsResult.error && !tagsResult.loading;
    const tagColors: Record<string, string> = {};
    ((tagsResult.data && tagsResult.data.tags) || []).forEach((tag) => (tagColors[tag.key] = tag.color));
    const values: EventInput[] =
        ready && tagsResult.data
            ? timeSpans.map((ts) => {
                  const tags = (ts.tags || []).map((t) => t.key + ':' + t.value);
                  const colorKey = [...tags].sort((a, b) => a.localeCompare(b)).join(' ');
                  const color = calculateColor(colorKey, ColorMode.Soft, theme.palette.mode);
                  return {
                      start: moment(ts.start).toDate(),
                      end: moment(ts.end).toDate(),
                      // translucent, so that overlapping blocks stay readable; the solid color is the stripe at the left
                      backgroundColor: alpha(color, theme.palette.mode === 'dark' ? 0.4 : 0.38),
                      id: String(ts.id),
                      title: tags.join(' '),
                      extendedProps: {ts, colors: tagColors},
                      textColor: theme.palette.text.primary,
                      borderColor: color,
                  };
              })
            : [];

    // dragging or resizing an event changes the time, the tags and the work content are kept
    const onChangeTime = (data: {event: EventApi; oldEvent: EventApi}) => {
        const ts: TimeSpanItem = data.event.extendedProps.ts;
        mutations.update(ts.id, moment(data.oldEvent.start!).format(), {
            start: data.event.start!,
            end: data.event.end!,
            tags: toTagSelectorEntry(tagsResult.data!.tags!, stripTypename(ts.tags || [])),
            note: ts.note,
        });
    };
    const onSelect: CalendarOptions['select'] = (data) => {
        // the editor is shown where the selection was ended
        const x = data.jsEvent ? data.jsEvent.clientX : window.innerWidth / 2;
        const y = data.jsEvent ? data.jsEvent.clientY : window.innerHeight / 2;
        setEditor({
            mode: 'create',
            anchor: {getBoundingClientRect: () => new DOMRect(x, y, 0, 0)},
            start: data.start,
            end: data.end,
            unselect: () => data.view.calendar.unselect(),
        });
    };
    const onClick: CalendarOptions['eventClick'] = (data) => {
        data.jsEvent.preventDefault();
        setEditor({mode: 'edit', anchor: data.el, ts: data.event.extendedProps.ts});
    };

    const closeEditor = () => {
        if (editor && editor.mode === 'create') {
            editor.unselect();
        }
        setEditor(null);
    };

    return (
        <TimesheetLayout view="calendar" actions={<ExportCsvButton onClick={exportCsv} disabled={timeSpans.length === 0} />}>
            <Paper sx={{flex: 1, minHeight: 0, padding: '10px'}}>
                <FullCalendarStyling>
                    <FullCalendar
                        locales={[zhCnLocale]}
                        locale="zh-cn"
                        initialView="timeGridWeek"
                        rerenderDelay={30}
                        datesSet={(x) => {
                            setView(x.view.type);
                            const next = {
                                start: moment(x.view.currentStart).format(),
                                end: moment(x.view.currentEnd).format(),
                            };
                            setRange((old) =>
                                moment(old.start).isSame(next.start) && moment(old.end).isSame(next.end) ? old : next
                            );
                        }}
                        // in the month only the overview is shown, the details are edited in the week
                        dateClick={(info) =>
                            info.view.type === 'dayGridMonth' && info.view.calendar.changeView('timeGridWeek', info.date)
                        }
                        dayMaxEvents={4}
                        eventDisplay="block"
                        editable={view !== 'dayGridMonth'}
                        // both edges can be dragged: the top edge changes the start, the bottom edge the end
                        eventResizableFromStart={true}
                        snapDuration={{minutes: 5}}
                        events={values}
                        allDaySlot={false}
                        selectable={view !== 'dayGridMonth'}
                        selectMirror={true}
                        unselectCancel={`.${EDITOR_CLASS}`}
                        handleWindowResize={true}
                        height="100%"
                        selectMinDistance={20}
                        defaultTimedEventDuration={{minute: 15}}
                        eventContent={(arg) =>
                            arg.view.type === 'dayGridMonth' ? (
                                <MonthEventContent event={arg.event} />
                            ) : (
                                <EventContent event={arg.event} />
                            )
                        }
                        slotLabelInterval={{minute: 60}}
                        slotDuration={{minute: 15}}
                        scrollTime={{hour: 6, minute: 30}}
                        select={onSelect}
                        firstDay={moment.localeData().firstDayOfWeek()}
                        eventResize={onChangeTime}
                        eventClick={onClick}
                        eventDrop={onChangeTime}
                        slotLabelFormat={(s) => toMoment(s.date.marker).format('LT')}
                        dayHeaderContent={(arg) => moment(arg.date).format(arg.view.type === 'dayGridMonth' ? 'ddd' : 'DD ddd')}
                        nowIndicator={true}
                        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                        headerToolbar={{
                            center: 'title',
                            left: 'prev,next today',
                            right: 'timeGridWeek,dayGridMonth',
                        }}
                    />
                </FullCalendarStyling>
            </Paper>
            {editor && editor.mode === 'create' ? (
                <TimeSpanEditor
                    key="create"
                    anchorEl={editor.anchor}
                    start={moment(editor.start)}
                    end={moment(editor.end)}
                    initialTags={[]}
                    initialNote=""
                    onConfirm={(result) =>
                        mutations.create({...result, start: editor.start, end: editor.end}).then((ok) => {
                            if (ok) {
                                editor.unselect();
                                setEditor(null);
                            }
                        })
                    }
                    onCancel={closeEditor}
                />
            ) : null}
            {editor && editor.mode === 'edit' && tagsResult.data && tagsResult.data.tags ? (
                <TimeSpanEditor
                    key={editor.ts.id}
                    anchorEl={editor.anchor}
                    start={moment(editor.ts.start)}
                    end={moment(editor.ts.end)}
                    initialTags={toTagSelectorEntry(
                        tagsResult.data.tags,
                        (editor.ts.tags || []).map((tag) => ({key: tag.key, value: tag.value}))
                    )}
                    initialNote={editor.ts.note}
                    onConfirm={(result) =>
                        mutations
                            .update(editor.ts.id, editor.ts.start, {...result, start: editor.ts.start, end: editor.ts.end})
                            .then((ok) => ok && setEditor(null))
                    }
                    onDelete={() => mutations.remove(editor.ts.id).then((ok) => ok && setEditor(null))}
                    onCancel={closeEditor}
                />
            ) : null}
        </TimesheetLayout>
    );
};

// The work content and a summary of the tags and the work content, which is used if there is only a single line.
const describeEvent = (event: EventApi): {note: string; summary: string} => {
    const note: string = (event.extendedProps.ts && event.extendedProps.ts.note) || '';
    return {note, summary: event.title && note ? `${event.title} · ${note}` : event.title || note};
};

// The tags are shown as small colored labels
const TagPills: React.FC<{event: EventApi; maxLines?: number}> = ({event, maxLines}) => {
    const tags: Array<{key: string; value: string}> = (event.extendedProps.ts && event.extendedProps.ts.tags) || [];
    const colors: Record<string, string> = event.extendedProps.colors || {};
    if (tags.length === 0) {
        return null;
    }
    return (
        <span className="pills" style={maxLines ? {maxHeight: `${maxLines * 1.6}em`} : undefined}>
            {tags.map((tag) => {
                const color = colors[tag.key] || '#9e9e9e';
                return (
                    <span
                        key={tag.key + ':' + tag.value}
                        className="pill"
                        style={{background: color, color: bestContrast(color, ['#fff', '#000'])}}>
                        {tag.key}:{tag.value}
                    </span>
                );
            })}
        </span>
    );
};

const EventContent: React.FC<{event: EventApi}> = ({event}) => {
    if (!event.start || !event.end) {
        return null;
    }

    const start = moment(event.start);
    const end = moment(event.end);
    const lines = Math.floor(end.diff(start, 'minute') / 15);
    const {note} = describeEvent(event);
    const hasTags = !!(event.extendedProps.ts && event.extendedProps.ts.tags && event.extendedProps.ts.tags.length);
    const time = (
        <b className="time">
            {start.format('LT')} - {end.format('LT')}
        </b>
    );

    if (lines < 2) {
        // a single line: the start, the tags and the work content
        return (
            <span className="ellipsis-single" title={event.title}>
                <b className="time">{start.format('LT')}</b> <TagPills event={event} />
                {note ? <span className="note"> {note}</span> : null}
            </span>
        );
    }

    // the time, the tags and below of them the work content
    const tagLines = hasTags ? (note ? 1 : lines - 1) : 0;
    return (
        <>
            {time}
            <br />
            {hasTags ? <TagPills event={event} maxLines={tagLines} /> : null}
            {note ? (
                <span
                    className="ellipsis note"
                    title={note}
                    style={{WebkitLineClamp: Math.max(1, lines - 1 - (hasTags ? 1 : 0))}}>
                    {note}
                </span>
            ) : null}
        </>
    );
};

const MonthEventContent: React.FC<{event: EventApi}> = ({event}) => {
    const {summary} = describeEvent(event);
    const text = `${moment(event.start!).format('HH:mm')} ${summary}`;
    return (
        <span className="ellipsis-single" title={text} style={{padding: '0 4px'}}>
            {text}
        </span>
    );
};
