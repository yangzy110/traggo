import * as React from 'react';
import moment from 'moment';
import {useQuery} from '@apollo/client/react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import * as gqlTimeSpan from '../gql/timeSpan';
import * as gqlTag from '../gql/tags';
import {Tags, TimeSpans, TimeSpansVariables, TimeSpans_timeSpans_timeSpans} from '../gql/types';
import {CenteredSpinner} from '../common/CenteredSpinner';
import {TagChip} from '../common/TagChip';
import {toTagSelectorEntry} from '../tag/tagSelectorEntry';
import {TimeSpanEditor} from './TimeSpanEditor';
import {TimesheetLayout} from './TimesheetLayout';
import {useTimeSpanMutations} from './useTimeSpanMutations';
import {groupByDay} from './timelist';
import {DAY_FORMAT, exportLog, formatDuration} from './teamutils';
import {ExportCsvButton} from '../common/ExportCsvButton';

const DEFAULT_TAG_COLOR = '#9e9e9e';

type Editor =
    {mode: 'create'; anchor: HTMLElement} | {mode: 'edit'; anchor: HTMLElement; timeSpan: TimeSpans_timeSpans_timeSpans};

// "My log" as a list: the time spans of the days, the newest first. More days are loaded while scrolling.
export const ListPage: React.FC = () => {
    const timeSpansResult = useQuery<TimeSpans, TimeSpansVariables>(gqlTimeSpan.TimeSpans, {
        variables: {cursor: {pageSize: 30}},
    });
    const tagsResult = useQuery<Tags>(gqlTag.Tags);
    const mutations = useTimeSpanMutations();
    const [editor, setEditor] = React.useState<Editor | null>(null);
    const [hasMore, setHasMore] = React.useState(true);
    const [loadingMore, setLoadingMore] = React.useState(false);
    const scroller = React.useRef<HTMLDivElement | null>(null);
    const sentinel = React.useRef<HTMLDivElement | null>(null);
    const loading = React.useRef(false);

    const colors: Record<string, string> = {};
    ((tagsResult.data && tagsResult.data.tags) || []).forEach((tag) => (colors[tag.key] = tag.color));
    const hasData = !!timeSpansResult.data;
    const loadedSpans = timeSpansResult.data ? timeSpansResult.data.timeSpans.timeSpans : null;
    const days = React.useMemo(() => groupByDay(loadedSpans || [], moment()), [loadedSpans]);

    const fetchMore = () => {
        if (!timeSpansResult.data || timeSpansResult.loading || loading.current) {
            return;
        }
        loading.current = true;
        setLoadingMore(true);
        const {offset, pageSize, startId} = timeSpansResult.data.timeSpans.cursor;
        timeSpansResult
            .fetchMore({
                variables: {cursor: {startId, offset, pageSize}},
                updateQuery: (prev, {fetchMoreResult}): TimeSpans => {
                    if (!fetchMoreResult) {
                        return prev;
                    }
                    return {
                        timeSpans: {
                            __typename: 'PagedTimeSpans',
                            timeSpans: [...prev.timeSpans.timeSpans, ...fetchMoreResult.timeSpans.timeSpans],
                            cursor: fetchMoreResult.timeSpans.cursor,
                        },
                    };
                },
            })
            .then((result) => {
                // less time spans than requested means that there are no more
                if (!result.data || result.data.timeSpans.timeSpans.length < pageSize) {
                    setHasMore(false);
                }
            })
            .catch(() => setHasMore(false))
            .finally(() => {
                loading.current = false;
                setLoadingMore(false);
            });
    };

    // Load the next page when the end of the list is (almost) visible.
    const fetchMoreRef = React.useRef(fetchMore);
    fetchMoreRef.current = fetchMore;
    React.useEffect(() => {
        const element = sentinel.current;
        if (!element || !hasMore || !hasData) {
            return;
        }
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((entry) => entry.isIntersecting)) {
                    fetchMoreRef.current();
                }
            },
            {root: scroller.current, rootMargin: '600px'}
        );
        observer.observe(element);
        return () => observer.disconnect();
        // the observer is created again after a page was loaded, it reports the current state when it starts observing
    }, [hasMore, loadedSpans, hasData]);

    // exports the time spans which are loaded (the older days are loaded while scrolling)
    const exportCsv = () => {
        const entries = (loadedSpans || []).map((ts) => ({
            member: '',
            start: ts.start,
            end: ts.end,
            tags: ts.tags,
            note: ts.note,
        }));
        entries.sort((a, b) => moment(a.start).diff(moment(b.start)));
        exportLog(`traggo-my-log_${moment().format(DAY_FORMAT)}.csv`, entries, false);
    };

    const close = () => setEditor(null);
    const newEnd = moment().startOf('minute');

    return (
        <TimesheetLayout
            view="list"
            actions={
                <>
                    <ExportCsvButton onClick={exportCsv} disabled={!loadedSpans || loadedSpans.length === 0} />
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={(e) => setEditor({mode: 'create', anchor: e.currentTarget})}>
                        新建记录
                    </Button>
                </>
            }>
            <Box ref={scroller} sx={{flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: 0.5}}>
                {timeSpansResult.loading && !timeSpansResult.data ? <CenteredSpinner /> : null}
                {timeSpansResult.data && days.length === 0 ? (
                    <Typography color="text.secondary" sx={{textAlign: 'center', marginTop: 6}}>
                        还没有记录。点击右上角的“新建记录”，或者切换到日历直接拖拽创建。
                    </Typography>
                ) : null}
                <Box sx={{maxWidth: 1000, margin: '0 auto'}}>
                    {days.map((day) => (
                        <Box key={day.key} sx={{marginBottom: 1}}>
                            <Box
                                sx={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    marginTop: 2,
                                    marginBottom: 1,
                                    marginX: 0.5,
                                }}>
                                <Typography variant="subtitle1" color="text.secondary" sx={{fontWeight: 600}}>
                                    {day.title}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    共 {formatDuration(day.seconds)}
                                </Typography>
                            </Box>
                            {day.timeSpans.map((timeSpan) => (
                                <TimeSpanRow
                                    key={timeSpan.id}
                                    timeSpan={timeSpan}
                                    colors={colors}
                                    onClick={(anchor) => setEditor({mode: 'edit', anchor, timeSpan})}
                                />
                            ))}
                        </Box>
                    ))}
                    <div ref={sentinel} />
                    {loadingMore ? (
                        <Typography color="text.secondary" sx={{textAlign: 'center', padding: 2}}>
                            加载中…
                        </Typography>
                    ) : null}
                </Box>
            </Box>
            {editor && editor.mode === 'create' ? (
                <TimeSpanEditor
                    key="create"
                    anchorEl={editor.anchor}
                    editableTime
                    start={moment(newEnd).subtract(1, 'hour')}
                    end={newEnd}
                    initialTags={[]}
                    initialNote=""
                    onConfirm={(result) => mutations.create(result).then((ok) => ok && close())}
                    onCancel={close}
                />
            ) : null}
            {editor && editor.mode === 'edit' && tagsResult.data && tagsResult.data.tags ? (
                <TimeSpanEditor
                    key={editor.timeSpan.id}
                    anchorEl={editor.anchor}
                    editableTime
                    start={moment(editor.timeSpan.start)}
                    end={moment(editor.timeSpan.end || editor.timeSpan.start)}
                    initialTags={toTagSelectorEntry(
                        tagsResult.data.tags,
                        (editor.timeSpan.tags || []).map((tag) => ({key: tag.key, value: tag.value}))
                    )}
                    initialNote={editor.timeSpan.note}
                    onConfirm={(result) =>
                        mutations.update(editor.timeSpan.id, editor.timeSpan.start, result).then((ok) => ok && close())
                    }
                    onDelete={() => mutations.remove(editor.timeSpan.id).then((ok) => ok && close())}
                    onCancel={close}
                />
            ) : null}
        </TimesheetLayout>
    );
};

const TimeSpanRow: React.FC<{
    timeSpan: TimeSpans_timeSpans_timeSpans;
    colors: Record<string, string>;
    onClick: (anchor: HTMLElement) => void;
}> = ({timeSpan, colors, onClick}) => {
    const start = moment(timeSpan.start);
    const end = moment(timeSpan.end || timeSpan.start);
    return (
        <Paper
            elevation={1}
            onClick={(e) => onClick(e.currentTarget)}
            sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 2,
                padding: '10px 16px',
                marginBottom: 1,
                cursor: 'pointer',
                '&:hover': {borderColor: 'primary.main'},
            }}>
            <Box sx={{minWidth: 112, fontVariantNumeric: 'tabular-nums'}}>
                <Typography>
                    {start.format('HH:mm')} - {end.format('HH:mm')}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    {formatDuration(end.diff(start, 'seconds'))}
                </Typography>
            </Box>
            <Box sx={{flex: 1, minWidth: 0}}>
                <div>
                    {(timeSpan.tags || []).map((tag) => (
                        <TagChip
                            key={tag.key + ':' + tag.value}
                            label={tag.key + ':' + tag.value}
                            color={colors[tag.key] || DEFAULT_TAG_COLOR}
                        />
                    ))}
                </div>
                {timeSpan.note ? (
                    <Typography variant="body2" sx={{whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginTop: 0.5}}>
                        {timeSpan.note}
                    </Typography>
                ) : null}
            </Box>
        </Paper>
    );
};
