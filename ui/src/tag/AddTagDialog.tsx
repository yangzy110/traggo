import * as React from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import {Checkbox} from '@mui/material';
import FormControlLabel from '@mui/material/FormControlLabel';
import {AddTag, AddTagVariables, CurrentUser, Tags} from '../gql/types';
import {pickTagColor} from '../common/tagColors';
import * as gqlTags from '../gql/tags';
import * as gqlUser from '../gql/user';
import {TagSelectorEntry} from './tagSelectorEntry';
import {useMutation, useQuery} from '@apollo/client/react';
import {useSnackbar} from 'notistack';
import {handleError} from '../utils/errors';

interface AddTagDialogProps {
    initialName: string;
    open: boolean;
    close: () => void;
    onAdded?: (tag: TagSelectorEntry['tag']) => void;
}

export const AddTagDialog: React.FC<AddTagDialogProps> = ({close, open, initialName, onAdded = () => {}}) => {
    const [name, setName] = React.useState(initialName);
    const [shared, setShared] = React.useState(true);
    const {enqueueSnackbar} = useSnackbar();
    const {data: tagData} = useQuery<Tags>(gqlTags.Tags);
    const {data: currentUser} = useQuery<CurrentUser>(gqlUser.CurrentUser);
    const admin = !!(currentUser && currentUser.user && currentUser.user.admin);

    const [addTag] = useMutation<AddTag, AddTagVariables>(gqlTags.AddTag, {refetchQueries: [{query: gqlTags.Tags}]});
    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        // the system assigns a color, it can be changed in the list of the tags
        const color = pickTagColor(((tagData && tagData.tags) || []).map((tag) => tag.color));
        addTag({variables: {name, color, shared: admin && shared}})
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
                <DialogTitle id="form-dialog-title">创建标签</DialogTitle>
                <DialogContent>
                    <DialogContentText />
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
                    {admin ? (
                        <FormControlLabel
                            control={<Checkbox checked={shared} onChange={(e) => setShared(e.target.checked)} />}
                            label="公用标签：所有用户可用，只有管理员可以修改"
                        />
                    ) : null}
                </DialogContent>
                <DialogActions>
                    <Button onClick={close} color="primary">
                        取消
                    </Button>
                    <Button type="submit" onClick={submit} color="primary">
                        创建标签
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
};
