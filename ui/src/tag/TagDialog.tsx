import * as React from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Typography from '@mui/material/Typography';
import {AddTag, AddTagVariables, Tags, UpdateTag, UpdateTagVariables} from '../gql/types';
import {pickTagColor} from '../common/tagColors';
import {TagColorGrid} from '../common/TagColorGrid';
import * as gqlTags from '../gql/tags';
import * as gqlDashboard from '../gql/dashboard';
import {TagSelectorEntry} from './tagSelectorEntry';
import {useMutation, useQuery} from '@apollo/client/react';
import {useSnackbar} from 'notistack';
import {handleError} from '../utils/errors';

interface TagDialogProps {
    // The tag which is edited, without it a new tag is created.
    tag?: {key: string; color: string};
    initialName?: string;
    open: boolean;
    close: () => void;
    onAdded?: (tag: TagSelectorEntry['tag']) => void;
}

// Creates a tag, or edits the name and the color of an existing tag. Only admins can do both.
export const TagDialog: React.FC<TagDialogProps> = ({close, open, tag, initialName = '', onAdded = () => {}}) => {
    const editing = !!tag;
    const [name, setName] = React.useState(tag ? tag.key : initialName);
    const {enqueueSnackbar} = useSnackbar();
    const {data: tagData} = useQuery<Tags>(gqlTags.Tags);
    const refetch = {refetchQueries: [{query: gqlTags.Tags}, {query: gqlDashboard.Dashboards}]};
    const [addTag] = useMutation<AddTag, AddTagVariables>(gqlTags.AddTag, refetch);
    const [updateTag] = useMutation<UpdateTag, UpdateTagVariables>(gqlTags.UpdateTag, refetch);
    // until the user chooses one, a tag keeps its color and a new tag gets the first color which is not used yet
    const [chosen, setChosen] = React.useState<string | null>(null);
    const color = chosen || (tag ? tag.color : pickTagColor(((tagData && tagData.tags) || []).map((t) => t.color)));

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (tag) {
            updateTag({variables: {key: tag.key, newKey: name, color}})
                .then(() => {
                    enqueueSnackbar('标签已更新', {variant: 'success'});
                    close();
                })
                .catch(handleError('编辑标签失败', enqueueSnackbar));
            return;
        }
        addTag({variables: {name, color}})
            .then((result) => {
                close();
                if (result && result.data && result.data.createTag) {
                    onAdded(result.data.createTag);
                }
            })
            .catch(handleError('创建标签失败', enqueueSnackbar));
    };

    return (
        <Dialog open={open} onClose={close} aria-labelledby="form-dialog-title" fullWidth>
            <form onSubmit={submit} noValidate autoComplete="off">
                <DialogTitle id="form-dialog-title">{editing ? '编辑标签' : '创建标签'}</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        id="name"
                        label="名称"
                        type="text"
                        fullWidth
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                    <Typography variant="caption" color="textSecondary" component="div" sx={{marginTop: 1}}>
                        颜色
                    </Typography>
                    <TagColorGrid value={color} onChange={setChosen} />
                </DialogContent>
                <DialogActions>
                    <Button onClick={close} color="primary">
                        取消
                    </Button>
                    <Button type="submit" color="primary">
                        {editing ? '保存' : '创建标签'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
};
