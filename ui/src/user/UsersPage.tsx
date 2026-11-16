import * as React from 'react';
import Paper from '@mui/material/Paper';
import {useMutation, useQuery} from '@apollo/client/react';
import * as gqlUser from '../gql/user';
import {CenteredSpinner} from '../common/CenteredSpinner';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import DoneIcon from '@mui/icons-material/Done';
import CloseIcon from '@mui/icons-material/Close';
import IconButton from '@mui/material/IconButton';
import {useSnackbar} from 'notistack';
import {TextField} from '@mui/material';
import {Users, RemoveUser, RemoveUserVariables, UpdateUser, UpdateUserVariables} from '../gql/types';
import Checkbox from '@mui/material/Checkbox';
import Button from '@mui/material/Button';
import {AddUserDialog} from './AddUserDialog';
import {ConfirmDialog} from '../common/ConfirmDialog';
import type {SxProps, Theme as MuiTheme} from '@mui/material/styles';
import {gutters} from '../common/styles';

const rootSx: SxProps<MuiTheme> = (theme) => ({
    ...gutters(theme),
    paddingTop: theme.spacing(3),
    paddingBottom: theme.spacing(3),
    textAlign: 'center',
    maxWidth: 800,
    margin: '0 auto',
});

const NoEdit = [-1, '', '', false] as const;

export const UsersPage = () => {
    const {data, loading} = useQuery<Users>(gqlUser.Users);
    const [addUser, setAddUser] = React.useState(false);
    const refetch = {refetchQueries: [{query: gqlUser.Users}, {query: gqlUser.CurrentUser}]};
    const {enqueueSnackbar} = useSnackbar();
    const [removeUserConfirmation, setRemoveUserConfirmation] = React.useState<false | [number, string]>(false);
    const [removeUser] = useMutation<RemoveUser, RemoveUserVariables>(gqlUser.RemoveUser, refetch);
    const [[editId, editName, editPass, editAdmin], setEditing] =
        React.useState<Readonly<[number, string, string, boolean]>>(NoEdit);
    const [updateUser] = useMutation<UpdateUser, UpdateUserVariables>(gqlUser.UpdateUser, refetch);
    if (loading || !data || !data.currentUser || !data.users) {
        return <CenteredSpinner />;
    }
    const onClickDelete = () => {
        if (removeUserConfirmation) {
            removeUser({variables: {id: removeUserConfirmation[0]}}).then(() =>
                enqueueSnackbar('user deleted', {variant: 'success'})
            );
        }
    };

    const users = data.users.map((user) => {
        const onClickSubmit = () => {
            setEditing(NoEdit);
            updateUser({
                variables: {
                    id: editId,
                    name: editName,
                    admin: editAdmin,
                    pass: editPass || undefined,
                },
            }).then(() => enqueueSnackbar('user edited', {variant: 'success'}));
        };
        const isCurrent = user.id === data.currentUser!.id;
        const isEdited = editId === user.id;
        return (
            <TableRow selected={isCurrent} key={user.id}>
                <TableCell>{user.id}</TableCell>
                <TableCell>
                    {isEdited ? (
                        <TextField
                            variant="standard"
                            value={editName}
                            onChange={(e) => setEditing([editId, e.target.value, '', editAdmin])}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    onClickSubmit();
                                }
                            }}
                            onSubmit={onClickSubmit}
                        />
                    ) : (
                        user.name + (isCurrent ? ' (current)' : '')
                    )}
                </TableCell>
                <TableCell>
                    {isEdited ? (
                        <TextField
                            variant="standard"
                            value={editPass}
                            placeholder={'use old password'}
                            type="password"
                            onChange={(e) => setEditing([editId, editName, e.target.value, editAdmin])}
                        />
                    ) : (
                        '********'
                    )}
                </TableCell>
                <TableCell>
                    {isEdited ? (
                        <Checkbox checked={editAdmin} onChange={(e) => setEditing([editId, editName, '', e.target.checked])} />
                    ) : user.admin ? (
                        'Yes'
                    ) : (
                        'No'
                    )}
                </TableCell>
                <TableCell align="right">
                    {isEdited ? (
                        <>
                            <IconButton onClick={onClickSubmit} title="Save">
                                <DoneIcon />
                            </IconButton>
                            <IconButton onClick={() => setEditing(NoEdit)} title="Cancel">
                                <CloseIcon />
                            </IconButton>
                        </>
                    ) : (
                        <>
                            <IconButton onClick={() => setEditing([user.id, user.name, '', user.admin])} title="Edit">
                                <EditIcon />
                            </IconButton>
                            <IconButton onClick={() => setRemoveUserConfirmation([user.id, user.name])} title="Delete">
                                <DeleteIcon />
                            </IconButton>
                        </>
                    )}
                </TableCell>
            </TableRow>
        );
    });

    return (
        <Paper elevation={1} square={true} sx={rootSx}>
            <Button
                color={'primary'}
                variant={'outlined'}
                size="small"
                onClick={() => setAddUser(true)}
                fullWidth
                style={{marginBottom: 10}}>
                Create User
            </Button>
            {addUser && <AddUserDialog open={true} close={() => setAddUser(false)} />}
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>ID</TableCell>
                        <TableCell>Name</TableCell>
                        <TableCell>Password</TableCell>
                        <TableCell>Admin</TableCell>
                        <TableCell style={{width: 150}} />
                    </TableRow>
                </TableHead>
                <TableBody>{users}</TableBody>
            </Table>
            {removeUserConfirmation ? (
                <ConfirmDialog
                    title={`Are you sure you want to delete the user '${removeUserConfirmation[1]}'?`}
                    fClose={() => setRemoveUserConfirmation(false)}
                    fOnSubmit={onClickDelete}>
                    <b>This operation cannot be undone.</b> Deleting the user includes deleting dashboards, time spans, tags and
                    devices of that user.
                </ConfirmDialog>
            ) : null}
        </Paper>
    );
};
