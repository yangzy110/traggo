import * as React from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import {SliderPicker} from 'react-color';
import {InputLabel} from '@mui/material';
import FormControl from '@mui/material/FormControl';
import {AddTag, AddTagVariables} from '../gql/types';
import * as gqlTags from '../gql/tags';
import {TagSelectorEntry} from './tagSelectorEntry';
import {useMutation} from '@apollo/client/react';
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
    const {enqueueSnackbar} = useSnackbar();

    const [addTag] = useMutation<AddTag, AddTagVariables>(gqlTags.AddTag, {refetchQueries: [{query: gqlTags.Tags}]});
    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        addTag({variables: {name, color}})
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
                        variant="standard"
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
