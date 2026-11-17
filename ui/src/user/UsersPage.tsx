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
import IconButton from '@mui/material/IconButton';
import {useSnackbar} from 'notistack';
import {Users, RemoveUser, RemoveUserVariables} from '../gql/types';
import Button from '@mui/material/Button';
import {UserDialog} from './UserDialog';
import {ConfirmDialog} from '../common/ConfirmDialog';
import {handleError} from '../utils/errors';
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

type EditedUser = {id: number; name: string; admin: boolean};

export const UsersPage = () => {
    const {data, loading} = useQuery<Users>(gqlUser.Users);
    // the user who is edited, the dialog is also used to create a user
    const [dialog, setDialog] = React.useState<false | 'new' | EditedUser>(false);
    const refetch = {refetchQueries: [{query: gqlUser.Users}, {query: gqlUser.CurrentUser}]};
    const {enqueueSnackbar} = useSnackbar();
    const [removeUserConfirmation, setRemoveUserConfirmation] = React.useState<false | [number, string]>(false);
    const [removeUser] = useMutation<RemoveUser, RemoveUserVariables>(gqlUser.RemoveUser, refetch);
    if (loading || !data || !data.currentUser || !data.users) {
        return <CenteredSpinner />;
    }
    const onClickDelete = () => {
        if (removeUserConfirmation) {
            removeUser({variables: {id: removeUserConfirmation[0]}})
                .then(() => enqueueSnackbar('用户已删除', {variant: 'success'}))
                .catch(handleError('删除用户失败', enqueueSnackbar));
        }
    };

    const users = data.users.map((user) => {
        const isCurrent = user.id === data.currentUser!.id;
        return (
            <TableRow selected={isCurrent} key={user.id}>
                <TableCell>{user.id}</TableCell>
                <TableCell>{user.name + (isCurrent ? '（当前）' : '')}</TableCell>
                <TableCell>{user.admin ? '管理员' : '普通用户'}</TableCell>
                <TableCell align="right" sx={{whiteSpace: 'nowrap'}}>
                    <IconButton onClick={() => setDialog({id: user.id, name: user.name, admin: user.admin})} title="编辑">
                        <EditIcon />
                    </IconButton>
                    <IconButton onClick={() => setRemoveUserConfirmation([user.id, user.name])} title="删除">
                        <DeleteIcon />
                    </IconButton>
                </TableCell>
            </TableRow>
        );
    });

    return (
        <Paper elevation={1} sx={rootSx}>
            <Button
                color={'primary'}
                variant={'outlined'}
                size="small"
                onClick={() => setDialog('new')}
                fullWidth
                style={{marginBottom: 10}}>
                创建用户
            </Button>
            {dialog === 'new' ? <UserDialog open={true} close={() => setDialog(false)} /> : null}
            {dialog && dialog !== 'new' ? (
                <UserDialog key={dialog.id} user={dialog} open={true} close={() => setDialog(false)} />
            ) : null}
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>ID</TableCell>
                        <TableCell>名称</TableCell>
                        <TableCell>角色</TableCell>
                        <TableCell style={{width: 150}} />
                    </TableRow>
                </TableHead>
                <TableBody>{users}</TableBody>
            </Table>
            {removeUserConfirmation ? (
                <ConfirmDialog
                    title={`确定要删除用户“${removeUserConfirmation[1]}”吗？`}
                    fClose={() => setRemoveUserConfirmation(false)}
                    fOnSubmit={onClickDelete}>
                    <b>此操作无法撤销。</b>删除用户会同时删除该用户的仪表盘、时间记录和设备。该用户创建的标签会保留。
                </ConfirmDialog>
            ) : null}
        </Paper>
    );
};
