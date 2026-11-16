import type {ApolloClient} from '@apollo/client';
import {InputCursor, TimeSpansInRange, TimeSpansInRangeVariables} from '../gql/types';
import * as gqlTimeSpan from '../gql/timeSpan';

export type TimeSpanItem = TimeSpansInRange['timeSpans']['timeSpans'][number];

// The server returns at most 100 time spans per request, so all pages of the range have to be requested.
const MAX_PAGES = 200;

export const fetchAllTimeSpans = async (client: ApolloClient, start: string, end: string): Promise<TimeSpanItem[]> => {
    const result: TimeSpanItem[] = [];
    let cursor: InputCursor | null = null;
    for (let page = 0; page < MAX_PAGES; page++) {
        const response: ApolloClient.QueryResult<TimeSpansInRange> = await client.query<
            TimeSpansInRange,
            TimeSpansInRangeVariables
        >({
            query: gqlTimeSpan.TimeSpansInRange,
            variables: {start, end, cursor},
            fetchPolicy: 'network-only',
        });
        if (!response.data) {
            throw response.error || new Error('no data received');
        }
        const paged: TimeSpansInRange['timeSpans'] = response.data.timeSpans;
        result.push(...paged.timeSpans);
        if (!paged.cursor.hasMore || paged.timeSpans.length === 0) {
            break;
        }
        cursor = {startId: paged.cursor.startId, offset: paged.cursor.offset, pageSize: paged.cursor.pageSize};
    }
    return result;
};
