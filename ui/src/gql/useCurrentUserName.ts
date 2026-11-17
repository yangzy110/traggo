import {useQuery} from '@apollo/client/react';
import * as gqlUser from './user';
import {CurrentUser} from './types';

// The name of the logged in user, empty as long as it is not known.
export const useCurrentUserName = (): string => {
    const {data} = useQuery<CurrentUser>(gqlUser.CurrentUser);
    return (data && data.user && data.user.name) || '';
};
