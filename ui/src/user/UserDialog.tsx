import * as React from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import * as gqlUser from '../gql/user';
import {useMutation} from '@apollo/client/react';
import {useSnackbar} from 'notistack';
import {handleError} from '../utils/errors';
import {Checkbox} from '@mui/material';
import {CreateUser, CreateUserVariables, UpdateUser, UpdateUserVariables} from '../gql/types';
import FormControlLabel from '@mui/material/FormControlLabel';

interface UserDialogProps {
    // The user who is edited, without it a new user is created.
    user?: {id: number; name: string; admin: boolean};
    open: boolean;
    close: () => void;
}

// Creates a user, or edits the name, the password and the role of an existing user. It works like the dialog of the tags.
export const UserDialog: React.FC<UserDialogProps> = ({close, open, user}) => {
    const editing = !!user;
    const [name, setName] = React.useState(user ? user.name : '');
    const [pass, setPass] = React.useState('');
    const [admin, setAdmin] = React.useState(user ? user.admin : false);
    const {enqueueSnackbar} = useSnackbar();

    const refetch = {refetchQueries: [{query: gqlUser.Users}, {query: gqlUser.CurrentUser}]};
    const [addUser] = useMutation<CreateUser, CreateUserVariables>(gqlUser.CreateUser, refetch);
    const [updateUser] = useMutation<UpdateUser, UpdateUserVariables>(gqlUser.UpdateUser, refetch);
    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (user) {
            updateUser({variables: {id: user.id, name, admin, pass: pass || undefined}})
                .then(() => {
                    enqueueSnackbar('用户已更新', {variant: 'success'});
                    close();
                })
                .catch(handleError('编辑用户失败', enqueueSnackbar));
            return;
        }
        addUser({variables: {name, pass, admin}})
            .then(() => {
                enqueueSnackbar('用户已创建', {variant: 'success'});
                close();
            })
            .catch(handleError('创建用户失败', enqueueSnackbar));
    };

    return (
        <Dialog open={open} onClose={close} aria-labelledby="form-dialog-title" fullWidth>
            <form onSubmit={submit} noValidate autoComplete="off">
                <DialogTitle id="form-dialog-title">{editing ? '编辑用户' : '创建用户'}</DialogTitle>
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
                    <TextField
                        margin="dense"
                        label="密码"
                        type="password"
                        fullWidth
                        value={pass}
                        placeholder={editing ? '不修改则留空' : undefined}
                        onChange={(e) => setPass(e.target.value)}
                    />
                    <FormControlLabel
                        control={<Checkbox checked={admin} onChange={(e) => setAdmin(e.target.checked)} />}
                        label="管理员"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={close} color="primary">
                        取消
                    </Button>
                    <Button type="submit" color="primary">
                        {editing ? '保存' : '创建用户'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
};
