import {gql} from '@apollo/client';

export const SuggestTag = gql`
    query SuggestTag($query: String!) {
        tags: suggestTag(query: $query) {
            color
            key
        }
    }
`;

export const Tags = gql`
    query Tags {
        tags {
            color
            key
            usages
            shared
            editable
        }
    }
`;
export const SuggestTagValue = gql`
    query SuggestTagValue($tag: String!, $query: String!) {
        values: suggestTagValue(key: $tag, query: $query)
    }
`;

export const AddTag = gql`
    mutation AddTag($name: String!, $color: String!, $shared: Boolean) {
        createTag(key: $name, color: $color, shared: $shared) {
            color
            key
        }
    }
`;

export const UpdateTag = gql`
    mutation UpdateTag($key: String!, $newKey: String, $color: String!, $shared: Boolean) {
        updateTag(key: $key, newKey: $newKey, color: $color, shared: $shared) {
            color
            key
        }
    }
`;

export const RemoveTag = gql`
    mutation RemoveTag($key: String!) {
        removeTag(key: $key) {
            color
            key
        }
    }
`;

export const UsedTagValues = gql`
    query UsedTagValues {
        usedTagValues {
            key
            value
        }
    }
`;

export const DefinedTagValues = gql`
    query DefinedTagValues {
        definedTagValues {
            key
            value
        }
    }
`;

export const AddTagValue = gql`
    mutation AddTagValue($key: String!, $value: String!) {
        addTagValue(key: $key, value: $value) {
            key
        }
    }
`;

export const RemoveTagValue = gql`
    mutation RemoveTagValue($key: String!, $value: String!) {
        removeTagValue(key: $key, value: $value) {
            key
        }
    }
`;
