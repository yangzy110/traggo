import * as React from 'react';
import {tagLabel} from '../../common/tagLabel';
import AddIcon from '@mui/icons-material/Add';
import {Box, Button, Fab, IconButton, Paper, ToggleButton, ToggleButtonGroup, Typography, useTheme} from '@mui/material';
import PrevIcon from '@mui/icons-material/ChevronLeft';
import NextIcon from '@mui/icons-material/ChevronRight';
import {alpha} from '@mui/material/styles';
import {tagStyle} from '../../common/tagStyle';
import {ImportCsvButton} from '../ImportCsvButton';
import {ExportRangeButton} from '../ExportRangeButton';
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
import {EDITOR_CLASS, nowInSteps, TimeSpanEditor} from '../TimeSpanEditor';
import {TimesheetLayout} from '../TimesheetLayout';
import {useTimeSpanMutations} from '../useTimeSpanMutations';
import {FullCalendarStyling} from './FullCalendarStyling';
import {stripTypename} from '../../utils/strip';
import {useSnackbar} from 'notistack';
import {fetchAllTimeSpans, TimeSpanItem} from '../fetchTimeSpans';

const toMoment = (date: Date): moment.Moment => {
    return moment(date).tz('utc');
};

// FullCalendar compares its options on every render and redraws (and scrolls back to the start time) if one of them is a new
// object. Everything which does not depend on the state is therefore defined once.
const NO_WEEKEND = [0, 6];
const ALL_DAYS: number[] = [];
const WEEKEND_KEY = 'traggo.calendar.weekend';
const PLUGINS = [dayGridPlugin, timeGridPlugin, interactionPlugin];
const LOCALES = [zhCnLocale];
const SNAP = {minutes: 15};
const DEFAULT_DURATION = {minute: 15};
const LABEL_INTERVAL = {minute: 60};
const SLOT_DURATION = {minute: 15};
const SCROLL_TIME = {hour: 6, minute: 30};
const slotLabelFormat: CalendarOptions['slotLabelFormat'] = (s) => toMoment(s.date.marker).format('LT');
const dayHeaderContent: CalendarOptions['dayHeaderContent'] = (arg) =>
    moment(arg.date).format(arg.view.type === 'dayGridMonth' ? 'ddd' : 'DD ddd');
const eventContent: CalendarOptions['eventContent'] = (arg) =>
    arg.view.type === 'dayGridMonth' ? <MonthEventContent event={arg.event} /> : <EventContent event={arg.event} />;
// in the month only the overview is shown, the details are edited in the week
const dateClick: CalendarOptions['dateClick'] = (info) =>
    info.view.type === 'dayGridMonth' && info.view.calendar.changeView('timeGridWeek', info.date);
const UNSELECT_CANCEL = `.${EDITOR_CLASS}`;

// The editor is shown below the end of a selection (to create a time span) or below an event (to change a time span).
type Editor =
    | {mode: 'create'; anchor: PopperProps['anchorEl']; start: Date; end: Date; editableTime?: boolean; unselect: () => void}
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
    const [title, setTitle] = React.useState('');
    const calendarRef = React.useRef<FullCalendar>(null);
    const api = () => (calendarRef.current ? calendarRef.current.getApi() : undefined);
    const [editor, setEditor] = React.useState<Editor | null>(null);
    const firstDay = moment.localeData().firstDayOfWeek();
    // the weekend is folded by default, the choice is remembered
    const [showWeekend, setShowWeekend] = React.useState(() => window.localStorage.getItem(WEEKEND_KEY) === 'true');
    const toggleWeekend = () => {
        window.localStorage.setItem(WEEKEND_KEY, String(!showWeekend));
        setShowWeekend(!showWeekend);
    };
    const weekendCount = timeSpans.filter((ts) => [0, 6].includes(moment(ts.start).day())).length;
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

    const ready = !loading && !tagsResult.error && !tagsResult.loading;
    const tagDefinitions = tagsResult.data && tagsResult.data.tags;
    const mode = theme.palette.mode;
    const textColor = theme.palette.text.primary;
    // the same array as long as nothing changed: opening the editor must not redraw the calendar
    const values: EventInput[] = React.useMemo(() => {
        if (!ready || !tagDefinitions) {
            return [];
        }
        const tagColors: Record<string, string> = {};
        tagDefinitions.forEach((tag) => (tagColors[tag.key] = tag.color));
        return timeSpans.map((ts) => {
            const tags = (ts.tags || []).map((t) => tagLabel(t));
            const colorKey = [...tags].sort((a, b) => a.localeCompare(b)).join(' ');
            // the color of the first tag, like the tag itself
            const first = (ts.tags || [])[0];
            const color = (first && tagColors[first.key]) || calculateColor(colorKey, ColorMode.Soft, mode);
            return {
                start: moment(ts.start).toDate(),
                end: moment(ts.end).toDate(),
                // translucent, so that overlapping blocks stay readable; the solid color is the stripe at the left
                backgroundColor: alpha(color, mode === 'dark' ? 0.28 : 0.16),
                id: String(ts.id),
                title: tags.join(' '),
                extendedProps: {ts, colors: tagColors},
                textColor,
                borderColor: color,
            };
        });
    }, [ready, tagDefinitions, timeSpans, mode, textColor]);

    // the handlers of the calendar are created once, they read the current state from here
    const latest = React.useRef({mutations, tagDefinitions});
    latest.current = {mutations, tagDefinitions};

    // dragging or resizing an event changes the time, the tags and the work content are kept
    const onChangeTime = React.useCallback((data: {event: EventApi; oldEvent: EventApi}) => {
        const ts: TimeSpanItem = data.event.extendedProps.ts;
        const {mutations: m, tagDefinitions: definitions} = latest.current;
        m.update(ts.id, moment(data.oldEvent.start!).format(), {
            start: data.event.start!,
            end: data.event.end!,
            tags: toTagSelectorEntry(definitions || [], stripTypename(ts.tags || [])),
            note: ts.note,
        });
    }, []);
    const onSelect: CalendarOptions['select'] = React.useCallback((data) => {
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
    }, []);
    const onClick: CalendarOptions['eventClick'] = React.useCallback((data) => {
        data.jsEvent.preventDefault();
        setEditor({mode: 'edit', anchor: data.el, ts: data.event.extendedProps.ts});
    }, []);
    const onDatesSet: CalendarOptions['datesSet'] = React.useCallback((x) => {
        setView(x.view.type);
        setTitle(x.view.title);
        const next = {start: moment(x.view.currentStart).format(), end: moment(x.view.currentEnd).format()};
        setRange((old) => (moment(old.start).isSame(next.start) && moment(old.end).isSame(next.end) ? old : next));
    }, []);

    const closeEditor = () => {
        if (editor && editor.mode === 'create') {
            editor.unselect();
        }
        setEditor(null);
    };

    return (
        <TimesheetLayout
            view="calendar"
            nav={
                <Box sx={{display: 'flex', alignItems: 'center', gap: 0.5, marginLeft: 1}}>
                    <IconButton aria-label="上一页" size="small" onClick={() => api()?.prev()}>
                        <PrevIcon />
                    </IconButton>
                    <IconButton aria-label="下一页" size="small" onClick={() => api()?.next()}>
                        <NextIcon />
                    </IconButton>
                    <Button size="small" onClick={() => api()?.today()}>
                        今天
                    </Button>
                    <Typography variant="h6" sx={{marginLeft: 1, fontWeight: 700, whiteSpace: 'nowrap'}}>
                        {title}
                    </Typography>
                </Box>
            }
            actions={
                <>
                    <ToggleButtonGroup
                        exclusive
                        size="small"
                        value={view === 'dayGridMonth' ? 'dayGridMonth' : 'timeGridWeek'}
                        aria-label="日期范围"
                        onChange={(_, value: string | null) => value && api()?.changeView(value)}>
                        <ToggleButton value="timeGridWeek">周</ToggleButton>
                        <ToggleButton value="dayGridMonth">月</ToggleButton>
                    </ToggleButtonGroup>
                    <ToggleButton
                        value="weekend"
                        size="small"
                        selected={showWeekend}
                        aria-label="周末"
                        onChange={toggleWeekend}
                        sx={{whiteSpace: 'nowrap', borderRadius: '8px', textTransform: 'none'}}>
                        {showWeekend ? '隐藏周末' : `显示周末${weekendCount > 0 ? `（${weekendCount}）` : ''}`}
                    </ToggleButton>
                    <ImportCsvButton onImported={() => setReload((n) => n + 1)} />
                    <ExportRangeButton />
                </>
            }>
            <Paper sx={{flex: 1, minHeight: 0, padding: '10px'}}>
                <FullCalendarStyling>
                    <FullCalendar
                        ref={calendarRef}
                        locales={LOCALES}
                        locale="zh-cn"
                        initialView="timeGridWeek"
                        rerenderDelay={30}
                        datesSet={onDatesSet}
                        dateClick={dateClick}
                        dayMaxEvents={4}
                        eventDisplay="block"
                        editable={view !== 'dayGridMonth'}
                        // both edges can be dragged: the top edge changes the start, the bottom edge the end
                        eventResizableFromStart={true}
                        snapDuration={SNAP}
                        // work blocks must not overlap
                        eventOverlap={false}
                        selectOverlap={false}
                        events={values}
                        allDaySlot={false}
                        selectable={view !== 'dayGridMonth'}
                        selectMirror={true}
                        unselectCancel={UNSELECT_CANCEL}
                        handleWindowResize={true}
                        height="100%"
                        selectMinDistance={20}
                        defaultTimedEventDuration={DEFAULT_DURATION}
                        eventContent={eventContent}
                        slotLabelInterval={LABEL_INTERVAL}
                        slotDuration={SLOT_DURATION}
                        scrollTime={SCROLL_TIME}
                        select={onSelect}
                        firstDay={firstDay}
                        hiddenDays={showWeekend ? ALL_DAYS : NO_WEEKEND}
                        eventResize={onChangeTime}
                        eventClick={onClick}
                        eventDrop={onChangeTime}
                        slotLabelFormat={slotLabelFormat}
                        dayHeaderContent={dayHeaderContent}
                        nowIndicator={true}
                        plugins={PLUGINS}
                        headerToolbar={false}
                    />
                </FullCalendarStyling>
            </Paper>
            <Fab
                color="primary"
                aria-label="新建记录"
                sx={{display: {xs: 'flex', sm: 'none'}, position: 'fixed', right: 20, bottom: 20, zIndex: 1100}}
                onClick={() =>
                    setEditor({
                        mode: 'create',
                        anchor: {getBoundingClientRect: () => new DOMRect(window.innerWidth / 2, 120, 0, 0)},
                        start: nowInSteps().subtract(1, 'hour').toDate(),
                        end: nowInSteps().toDate(),
                        editableTime: true,
                        unselect: () => {},
                    })
                }>
                <AddIcon />
            </Fab>
            {editor && editor.mode === 'create' ? (
                <TimeSpanEditor
                    key="create"
                    editableTime={editor.editableTime}
                    anchorEl={editor.anchor}
                    start={moment(editor.start)}
                    end={moment(editor.end)}
                    initialTags={[]}
                    initialNote=""
                    onConfirm={(result) =>
                        mutations
                            .create(editor.editableTime ? result : {...result, start: editor.start, end: editor.end})
                            .then((ok) => {
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
    const theme = useTheme();
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
                        key={tagLabel(tag)}
                        className="pill"
                        style={{
                            ...tagStyle(theme, color),
                            backgroundColor: `color-mix(in srgb, ${color} 30%, ${theme.palette.background.paper})`,
                            borderWidth: 1,
                            borderStyle: 'solid',
                        }}>
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

    // the time, below of it the tags and the work content in the same row
    return (
        <>
            {time}
            <div className="tag-row">
                {hasTags ? <TagPills event={event} /> : null}
                {note ? (
                    <span className="ellipsis note" title={note} style={{WebkitLineClamp: Math.max(1, lines - 1)}}>
                        {note}
                    </span>
                ) : null}
            </div>
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
