import type {OperationVariables} from '@apollo/client';
import type {useQuery} from '@apollo/client/react';

// The result of useQuery. Partial data is only returned when `returnPartialData` is set, which is never the case here.
export type QueryResult<TData, TVariables extends OperationVariables = OperationVariables> = useQuery.Result<
    TData,
    TVariables,
    'complete' | 'streaming' | 'empty'
>;
