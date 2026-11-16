import {ApolloClient, HttpLink, InMemoryCache} from '@apollo/client';
import {ApolloProvider as Provider} from '@apollo/client/react';
import * as React from 'react';

// exported for the tests, they clear the cache
export const client = new ApolloClient({
    link: new HttpLink({uri: './graphql'}),
    cache: new InMemoryCache(),
});

export const ApolloProvider: React.FC<React.PropsWithChildren> = ({children}) => {
    return <Provider client={client}>{children}</Provider>;
};
