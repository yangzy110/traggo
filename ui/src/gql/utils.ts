import type {ApolloCache} from '@apollo/client';
import {TimeSpans, AddTimeSpan_createTimeSpan, TimeSpansInRange, TimeSpansInRangeVariables, Trackers, StopTimer} from './types';
import * as gqlTimeSpan from './timeSpan';
import moment from 'moment';

export const addTimeSpanToCache = (cache: ApolloCache, ts: AddTimeSpan_createTimeSpan) => {
    let oldTimeSpans: TimeSpans | null = null;
    try {
        oldTimeSpans = cache.readQuery<TimeSpans>({query: gqlTimeSpan.TimeSpans});
    } catch {}
    if (!oldTimeSpans) {
        return;
    }
    cache.writeQuery<TimeSpans>({
        query: gqlTimeSpan.TimeSpans,
        data: {
            timeSpans: {
                __typename: 'PagedTimeSpans',
                timeSpans: oldTimeSpans.timeSpans.timeSpans
                    .concat([ts])
                    .sort((a, b) => moment(b.start).unix() - moment(a.start).unix()),
                cursor: oldTimeSpans.timeSpans.cursor,
            },
        },
    });
};
export const addTimeSpanInRangeToCache = (
    cache: ApolloCache,
    ts: AddTimeSpan_createTimeSpan,
    vars: TimeSpansInRangeVariables
) => {
    const oldTimeSpans = cache.readQuery<TimeSpansInRange>({query: gqlTimeSpan.TimeSpansInRange, variables: vars});
    if (!oldTimeSpans) {
        return;
    }
    cache.writeQuery<TimeSpansInRange>({
        query: gqlTimeSpan.TimeSpansInRange,
        variables: vars,
        data: {
            timeSpans: {
                __typename: 'PagedTimeSpans',
                timeSpans: oldTimeSpans.timeSpans.timeSpans
                    .concat([ts])
                    .sort((a, b) => moment(b.start).unix() - moment(a.start).unix()),
                cursor: oldTimeSpans.timeSpans.cursor,
            },
        },
    });
};
export const removeFromTrackersCache = (cache: ApolloCache, data: StopTimer) => {
    const oldTrackers = cache.readQuery<Trackers>({query: gqlTimeSpan.Trackers});
    if (!oldTrackers || !data || !data.stopTimeSpan) {
        return;
    }
    cache.writeQuery<Trackers>({
        query: gqlTimeSpan.Trackers,
        data: {
            timers: (oldTrackers.timers || []).filter((tracker) => tracker.id !== data.stopTimeSpan!.id),
        },
    });
};

export const removeFromTimeSpanInRangeCache = (cache: ApolloCache, id: number, vars: TimeSpansInRangeVariables) => {
    const old = cache.readQuery<TimeSpansInRange>({query: gqlTimeSpan.TimeSpansInRange, variables: vars});
    if (!old) {
        return;
    }
    cache.writeQuery<TimeSpansInRange>({
        query: gqlTimeSpan.TimeSpansInRange,
        variables: vars,
        data: {
            timeSpans: {
                __typename: 'PagedTimeSpans',
                timeSpans: old.timeSpans.timeSpans.filter((ts) => ts.id !== id),
                cursor: old.timeSpans.cursor,
            },
        },
    });
};
