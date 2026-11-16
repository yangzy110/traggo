import * as React from 'react';
import {useQuery} from '@apollo/client/react';
import * as gqlTimeSpan from '../gql/timeSpan';
import * as gqlTag from '../gql/tags';
import {Trackers, Tags} from '../gql/types';
import {TimeSpan} from './TimeSpan';
import {toTimeSpanProps} from './timespanutils';
import {Typography} from '@mui/material';

export const ActiveTrackers = () => {
    const trackersResult = useQuery<Trackers>(gqlTimeSpan.Trackers, {fetchPolicy: 'cache-and-network'});
    const tagsResult = useQuery<Tags>(gqlTag.Tags, {fetchPolicy: 'cache-and-network'});
    const values = React.useMemo(() => {
        if (
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
        return toTimeSpanProps(trackersResult.data.timers, tagsResult.data.tags);
    }, [tagsResult, trackersResult]);

    if (!values.length) {
        return null;
    }

    return (
        <>
            <Typography align="center" variant="h5" style={{marginTop: 10}}>
                Active Timers
            </Typography>
            {values.map((value) => {
                return <TimeSpan key={value.id} {...value} />;
            })}
        </>
    );
};
