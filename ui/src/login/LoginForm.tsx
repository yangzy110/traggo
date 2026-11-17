import * as React from 'react';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import {useSnackbar} from 'notistack';
import {handleError} from '../utils/errors';
import * as gqlUser from '../gql/user';
import {LoginUser, LoginUserVariables, DeviceType} from '../gql/types';
import {useMutation} from '@apollo/client/react';
import {Settings as SettingsGQL} from '../gql/settings';

export const LoginForm = () => {
    const [login] = useMutation<LoginUser, LoginUserVariables>(gqlUser.Login, {
        update: (cache, {data}) => {
            cache.writeQuery({query: gqlUser.CurrentUser, data: {user: data && data.login && data.login.user}});
        },
        refetchQueries: [{query: SettingsGQL}],
    });

    const {enqueueSnackbar} = useSnackbar();
    const [username, setUsername] = React.useState('');
    const [password, setPassword] = React.useState('');
    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        login({
            variables: {
                name: username,
                pass: password,
                deviceType: DeviceType.LongExpiry,
            },
        })
            .then(() => enqueueSnackbar('登录成功', {variant: 'success'}))
            .catch(handleError('登录失败', enqueueSnackbar));
    };
    return (
        <form noValidate autoComplete="off" onSubmit={submit}>
            <TextField
                required
                margin="dense"
                variant="outlined"
                label="用户名"
                autoFocus
                fullWidth
                onChange={(e) => setUsername(e.target.value)}
            />
            <TextField
                required
                type="password"
                margin="dense"
                variant="outlined"
                label="密码"
                fullWidth
                onChange={(e) => setPassword(e.target.value)}
            />
            <Button type="submit" sx={{marginTop: 1}} fullWidth size="large" onClick={submit} variant="contained" color="primary">
                登录
            </Button>
        </form>
    );
};
