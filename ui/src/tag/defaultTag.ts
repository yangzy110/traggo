import {useQuery} from '@apollo/client/react';
import * as gqlTag from '../gql/tags';
import {useSettings} from '../gql/settings';
import {Tags} from '../gql/types';
import {TagSelectorEntry} from './tagSelectorEntry';

// The tags are shown in this order (also in the picker), so that "the first tag" is the same everywhere.
export const sortTags = <T extends {key: string}>(tags: T[]): T[] => [...tags].sort((a, b) => a.key.localeCompare(b.key));

// The tag which is preselected for new time spans: the default tag of the user, or the first tag if the user has no default
// tag (or it was archived or removed). Archived tags are never used. It is null as long as the tags are not loaded.
export const useDefaultTag = (): TagSelectorEntry | null => {
    const {defaultTag} = useSettings();
    const tagsResult = useQuery<Tags>(gqlTag.Tags);
    const usable = sortTags(((tagsResult.data && tagsResult.data.tags) || []).filter((tag) => !tag.archived));
    const tag = usable.find((t) => t.key === defaultTag) || usable[0];
    return tag ? {tag, value: ''} : null;
};
