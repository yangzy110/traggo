import * as React from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import {SliderPicker} from 'react-color';
import {Checkbox, InputLabel} from '@mui/material';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormControl from '@mui/material/FormControl';
import {AddTag, AddTagVariables, CurrentUser} from '../gql/types';
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
    const [color, setColor] = React.useState('#e6b3b3');
    const [shared, setShared] = React.useState(false);
    const {enqueueSnackbar} = useSnackbar();
    const {data: currentUser} = useQuery<CurrentUser>(gqlUser.CurrentUser);
    const admin = !!(currentUser && currentUser.user && currentUser.user.admin);

    const [addTag] = useMutation<AddTag, AddTagVariables>(gqlTags.AddTag, {refetchQueries: [{query: gqlTags.Tags}]});
    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        addTag({variables: {name, color, shared: admin && shared}})
            .then((result) => {
                close();
                if (result && result.data && result.data.createTag) {
                    onAdded(result.data.createTag);
                }
            })
            .catch(handleError('Add Tag', enqueueSnackbar));
    };

    return (
        <Dialog open={open} onClose={close} aria-labelledby="form-dialog-title" fullWidth>
            <form onSubmit={submit} noValidate autoComplete="off">
                <DialogTitle id="form-dialog-title">Create Tag</DialogTitle>
                <DialogContent>
                    <DialogContentText />
                    <TextField
                        autoFocus
                        margin="dense"
                        id="name"
                        label="Name"
                        type="text"
                        fullWidth
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                    <FormControl variant="standard" fullWidth margin="dense">
                        <InputLabel htmlFor="color-picker" shrink={true}>
                            Color
                        </InputLabel>
                        <div id="color-picker" style={{marginTop: 25}}>
                            <SliderPicker onChange={(c) => setColor(c.hex)} color={color} />
                        </div>
                    </FormControl>
                    {admin ? (
                        <FormControlLabel
                            control={<Checkbox checked={shared} onChange={(e) => setShared(e.target.checked)} />}
                            label="Shared tag: usable by all users, only admins can change it"
                        />
                    ) : null}
                </DialogContent>
                <DialogActions>
                    <Button onClick={close} color="primary">
                        Cancel
                    </Button>
                    <Button type="submit" onClick={submit} color="primary">
                        Create Tag
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
};
