import moment from 'moment';
import {useMutation} from '@apollo/client/react';
import {useSnackbar} from 'notistack';
import {
    AddTimeSpan,
    AddTimeSpanVariables,
    RemoveTimeSpan,
    RemoveTimeSpanVariables,
    UpdateTimeSpan,
    UpdateTimeSpanVariables,
} from '../gql/types';
import * as gqlTimeSpan from '../gql/timeSpan';
import {addTimeSpanToCache} from '../gql/utils';
import {TagSelectorEntry, toInputTags} from '../tag/tagSelectorEntry';
import {handleError} from '../utils/errors';

interface TimeSpanInput {
    start: moment.Moment | Date | string;
    end: moment.Moment | Date | string;
    tags: TagSelectorEntry[];
    note: string;
}

// Creating, changing and removing of time spans for the calendar and the list. The result is true if it worked, the error
// is shown to the user otherwise. `onChanged` is called after a time span was created, changed or removed.
export const useTimeSpanMutations = (onChanged: () => void = () => {}) => {
    const {enqueueSnackbar} = useSnackbar();
    const [addMutation] = useMutation<AddTimeSpan, AddTimeSpanVariables>(gqlTimeSpan.AddTimeSpan, {
        update: (cache, {data}) => {
            if (!data || !data.createTimeSpan) {
                return;
            }
            addTimeSpanToCache(cache, data.createTimeSpan);
        },
    });
    const [updateMutation] = useMutation<UpdateTimeSpan, UpdateTimeSpanVariables>(gqlTimeSpan.UpdateTimeSpan);
    const [removeMutation] = useMutation<RemoveTimeSpan, RemoveTimeSpanVariables>(gqlTimeSpan.RemoveTimeSpan, {
        update: (cache, {data}) => {
            if (data && data.removeTimeSpan) {
                // the lists which contain the time span do not show it anymore
                cache.evict({id: cache.identify({__typename: 'TimeSpan', id: data.removeTimeSpan.id})});
                cache.gc();
            }
        },
    });

    return {
        create: (input: TimeSpanInput): Promise<boolean> =>
            addMutation({
                variables: {
                    start: moment(input.start).format(),
                    end: moment(input.end).format(),
                    tags: toInputTags(input.tags),
                    note: input.note,
                },
            })
                .then(() => {
                    onChanged();
                    return true;
                })
                .catch((error) => {
                    handleError('保存失败', enqueueSnackbar)(error);
                    return false;
                }),
        update: (id: number, oldStart: string, input: TimeSpanInput): Promise<boolean> =>
            updateMutation({
                variables: {
                    id,
                    oldStart,
                    start: moment(input.start).format(),
                    end: moment(input.end).format(),
                    tags: toInputTags(input.tags),
                    note: input.note,
                },
            })
                .then(() => {
                    onChanged();
                    return true;
                })
                .catch((error) => {
                    handleError('保存失败', enqueueSnackbar)(error);
                    return false;
                }),
        remove: (id: number): Promise<boolean> =>
            removeMutation({variables: {id}})
                .then(() => {
                    onChanged();
                    return true;
                })
                .catch((error) => {
                    handleError('删除失败', enqueueSnackbar)(error);
                    return false;
                }),
    };
};
