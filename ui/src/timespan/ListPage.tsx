import * as React from 'react';
import {tagLabel} from '../common/tagLabel';
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
import {nowInSteps, TimeSpanEditor} from './TimeSpanEditor';
import {TimesheetLayout} from './TimesheetLayout';
import {useTimeSpanMutations} from './useTimeSpanMutations';
import {groupByDay} from './timelist';
import {formatDuration} from './team/teamutils';
import {EmptyState} from '../common/EmptyState';
import EventNoteIcon from '@mui/icons-material/EventNote';
import {ImportCsvButton} from './csvimport/ImportCsvButton';
import {ExportRangeButton} from './ExportRangeButton';

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

    const close = () => setEditor(null);
    const newEnd = nowInSteps();

    return (
        <TimesheetLayout
            view="list"
            actions={
                <>
                    <ImportCsvButton onImported={() => timeSpansResult.refetch()} />
                    <ExportRangeButton />
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
                    <EmptyState icon={<EventNoteIcon />} title="还没有记录" hint="点击“新建记录”，或者切换到日历直接拖拽创建。" />
                ) : null}
                <Box sx={{maxWidth: 1000, margin: '0 auto'}}>
                    {days.map((day) => (
                        <Paper key={day.key} sx={{marginBottom: 2, overflow: 'hidden'}}>
                            <Box
                                sx={(theme) => ({
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'baseline',
                                    padding: '10px 16px',
                                    background: theme.palette.action.hover,
                                    borderBottom: `1px solid ${theme.palette.divider}`,
                                })}>
                                <Typography variant="subtitle2">{day.title}</Typography>
                                <Typography variant="body2" color="text.secondary" sx={{fontVariantNumeric: 'tabular-nums'}}>
                                    合计 <b>{formatDuration(day.seconds)}</b>
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
                        </Paper>
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
                    preselectDefaultTag
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
    // the row has the color of its first tag, so it differs from the background
    const firstTag = (timeSpan.tags || [])[0];
    const accent = (firstTag && colors[firstTag.key]) || DEFAULT_TAG_COLOR;
    return (
        <Box
            onClick={(e) => onClick(e.currentTarget)}
            sx={(theme) => ({
                display: 'flex',
                alignItems: 'flex-start',
                gap: 2,
                padding: '12px 16px',
                cursor: 'pointer',
                borderLeft: `3px solid ${accent}`,
                borderBottom: `1px solid ${theme.palette.divider}`,
                '&:last-of-type': {borderBottom: 0},
                '&:hover': {background: theme.palette.action.hover},
            })}>
            <Box sx={{minWidth: 112, fontVariantNumeric: 'tabular-nums'}}>
                <Typography sx={{fontWeight: 700}}>
                    {start.format('HH:mm')} - {end.format('HH:mm')}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    {formatDuration(end.diff(start, 'seconds'))}
                </Typography>
            </Box>
            <Box sx={{flex: 1, minWidth: 0}}>
                <div>
                    {(timeSpan.tags || []).map((tag) => (
                        <TagChip key={tagLabel(tag)} label={tagLabel(tag)} color={colors[tag.key] || DEFAULT_TAG_COLOR} />
                    ))}
                </div>
                {timeSpan.note ? (
                    <Typography variant="body2" sx={{whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginTop: 0.5}}>
                        {timeSpan.note}
                    </Typography>
                ) : null}
            </Box>
        </Box>
    );
};
