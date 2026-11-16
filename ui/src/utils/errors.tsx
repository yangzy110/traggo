import * as React from 'react';
import type {ErrorLike} from '@apollo/client';
import {CombinedGraphQLErrors} from '@apollo/client/errors';
import type {ProviderContext} from 'notistack';

export const handleError = (prefix: string, enqueue: ProviderContext['enqueueSnackbar']): ((error: ErrorLike) => void) => {
    return (error) => {
        if (CombinedGraphQLErrors.is(error)) {
            error.errors.forEach((gqlError) => {
                enqueue(`${prefix}: ${gqlError.message}`, {variant: 'warning'});
            });
        } else {
            enqueue(`${prefix}: ${error.message}`, {variant: 'warning'});
        }
    };
};

export const useError = (timeout = 1000): [boolean, string, (s: string) => void] => {
    const [error, setError] = React.useState('');
    const [active, setActive] = React.useState(false);

    React.useLayoutEffect(() => {
        if (!active) {
            return;
        }
        const handle = setTimeout(() => {
            setActive(false);
        }, timeout);
        return () => clearTimeout(handle);
    }, [active, timeout]);

    return [
        active,
        error,
        (message: string) => {
            setError(message);
            setActive(true);
        },
    ];
};
