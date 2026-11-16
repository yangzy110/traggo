import * as React from 'react';
import {useQuery} from '@apollo/client/react';
import * as gqlTimeSpan from '../gql/timeSpan';
import * as gqlTag from '../gql/tags';
import {TimeSpan, TimeSpanProps} from './TimeSpan';
import {Tags, TimeSpans, TimeSpansVariables} from '../gql/types';
import {useInterval} from '../utils/hooks';
import moment from 'moment';
import {Typography} from '@mui/material';
import {GroupedTimeSpanProps, toGroupedTimeSpanProps} from './timespanutils';
import {TagSelectorEntry} from '../tag/tagSelectorEntry';
import {isSameDate} from '../utils/time';

interface DoneTrackersProps {
    addTagsToTracker?: (entries: TagSelectorEntry[]) => void;
}

export const DoneTrackers: React.FC<DoneTrackersProps> = ({addTagsToTracker}) => {
    const trackersResult = useQuery<TimeSpans, TimeSpansVariables>(gqlTimeSpan.TimeSpans, {
        variables: {cursor: {pageSize: 30}},
    });
    const loading = React.useRef(false);
    const tagsResult = useQuery<Tags>(gqlTag.Tags);
    const [infiniteLoading, setInfiniteLoading] = React.useState(false);
    const [hasMore, setHasMore] = React.useState(true);
    const sentinel = React.useRef<HTMLDivElement | null>(null);
    const [currentDate, setCurrentDate] = React.useState(moment());
    useInterval(
        () => {
            if (!isSameDate(currentDate, moment())) {
                setCurrentDate(moment());
            }
        },
        1000,
        true
    );

    const fetchMore = () => {
        if (!trackersResult || !trackersResult.data || trackersResult.loading || loading.current) {
            return;
        }
        loading.current = true;
        setInfiniteLoading(true);
        const {offset, pageSize, startId} = trackersResult.data.timeSpans.cursor;
        trackersResult
            .fetchMore({
                variables: {
                    cursor: {
                        startId,
                        offset,
                        pageSize,
                    },
                },
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
                loading.current = false;
                // less time spans than requested means that there are no more
                if (!result.data || result.data.timeSpans.timeSpans.length < pageSize) {
                    setHasMore(false);
                }
                return setInfiniteLoading(false);
            })
            .catch(() => {
                loading.current = false;
                return setInfiniteLoading(false);
            });
    };

    const values: GroupedTimeSpanProps = React.useMemo(() => {
        if (
            trackersResult.error ||
            trackersResult.loading ||
            !trackersResult.data ||
            trackersResult.data.timeSpans === null ||
            tagsResult.error ||
            tagsResult.loading ||
            !tagsResult.data ||
            tagsResult.data.tags === null
        ) {
            return [];
        }
        return toGroupedTimeSpanProps(trackersResult.data.timeSpans.timeSpans, tagsResult.data.tags, currentDate);
    }, [trackersResult, tagsResult, currentDate]);

    // Load the next page when the end of the list is (almost) visible.
    const fetchMoreRef = React.useRef(fetchMore);
    fetchMoreRef.current = fetchMore;
    const loadedCount = trackersResult.data ? trackersResult.data.timeSpans.timeSpans.length : 0;
    React.useEffect(() => {
        const element = sentinel.current;
        if (!element || !hasMore) {
            return;
        }
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((entry) => entry.isIntersecting)) {
                    fetchMoreRef.current();
                }
            },
            {rootMargin: '2000px'}
        );
        observer.observe(element);
        return () => observer.disconnect();
        // the observer is created again after a page was loaded, it reports the current state when it starts observing
    }, [hasMore, loadedCount]);

    return (
        <div style={{marginTop: 10}}>
            {values.map(({key, timeSpans}) => (
                <DatedTimeSpans key={key} name={key} timeSpans={timeSpans} addTagsToTracker={addTagsToTracker} />
            ))}
            <div ref={sentinel} />
            {infiniteLoading ? (
                <Typography align={'center'} variant={'h5'}>
                    .. loading time spans ..
                </Typography>
            ) : null}
        </div>
    );
};

const DatedTimeSpans: React.FC<
    {
        name: string;
        timeSpans: TimeSpanProps[];
    } & DoneTrackersProps
> = ({name, timeSpans, addTagsToTracker}) => {
    return (
        <div>
            <Typography variant="subtitle1" color="text.secondary" sx={{mt: 3, mb: 1, ml: 0.5, fontWeight: 600}}>
                {name}
            </Typography>
            {timeSpans.map((timeSpanProps) => (
                <TimeSpan key={timeSpanProps.id} {...timeSpanProps} addTagsToTracker={addTagsToTracker} />
            ))}
        </div>
    );
};
