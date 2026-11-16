import {gql} from '@apollo/client';
import {ServerVersion as VersionResponse} from './types';

export const Version = gql`
    query ServerVersion {
        version {
            name
            commit
            buildDate
        }
    }
`;

export const VersionDefault: VersionResponse = {
    version: {__typename: 'Version', commit: 'unknown', buildDate: 'unknown', name: 'vUnknown'},
};
