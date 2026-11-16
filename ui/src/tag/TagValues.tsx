import * as React from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import {useMutation} from '@apollo/client/react';
import {useSnackbar} from 'notistack';
import * as gqlTag from '../gql/tags';
import {AddTagValue, AddTagValueVariables, RemoveTagValue, RemoveTagValueVariables} from '../gql/types';
import {handleError} from '../utils/errors';

interface TagValuesProps {
    tagKey: string;
    values: string[];
    // who is allowed to change the tag (admins for shared tags) can define the values
    editable: boolean;
}

// The values which can be chosen for a tag when a time span is logged.
export const TagValues: React.FC<TagValuesProps> = ({tagKey, values, editable}) => {
    const [value, setValue] = React.useState('');
    const {enqueueSnackbar} = useSnackbar();
    const refetch = {refetchQueries: [{query: gqlTag.DefinedTagValues}, {query: gqlTag.UsedTagValues}]};
    const [addValue] = useMutation<AddTagValue, AddTagValueVariables>(gqlTag.AddTagValue, refetch);
    const [removeValue] = useMutation<RemoveTagValue, RemoveTagValueVariables>(gqlTag.RemoveTagValue, refetch);

    const submit = () => {
        const trimmed = value.trim();
        if (!trimmed) {
            return;
        }
        setValue('');
        addValue({variables: {key: tagKey, value: trimmed}}).catch(handleError('添加值失败', enqueueSnackbar));
    };

    return (
        <Box sx={{display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.75, mt: 0.75}}>
            {values.length === 0 && !editable ? (
                <Typography variant="caption" color="text.secondary">
                    还没有值
                </Typography>
            ) : null}
            {values.map((v) => (
                <Chip
                    key={v}
                    size="small"
                    variant="outlined"
                    label={v}
                    onDelete={
                        editable
                            ? () =>
                                  removeValue({variables: {key: tagKey, value: v}}).catch(
                                      handleError('删除值失败', enqueueSnackbar)
                                  )
                            : undefined
                    }
                />
            ))}
            {editable ? (
                <TextField
                    variant="standard"
                    size="small"
                    placeholder="添加值，回车确认"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            submit();
                        }
                    }}
                    slotProps={{htmlInput: {'aria-label': `添加 ${tagKey} 的值`}}}
                    sx={{minWidth: 140}}
                />
            ) : null}
        </Box>
    );
};
