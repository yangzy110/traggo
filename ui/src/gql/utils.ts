import type {ApolloCache} from '@apollo/client';
import {TimeSpans, AddTimeSpan_createTimeSpan} from './types';
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
