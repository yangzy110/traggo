import * as React from 'react';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import {useSnackbar} from 'notistack';
import {handleError} from '../utils/errors';
import * as gqlUser from '../gql/user';
import {LoginUser, LoginUserVariables, DeviceType} from '../gql/types';
import {useMutation} from '@apollo/client/react';
import {Checkbox} from '@mui/material';
import FormControlLabel from '@mui/material/FormControlLabel';
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
    const [remember, setRemember] = React.useState(false);
    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        login({
            variables: {
                name: username,
                pass: password,
                deviceType: remember ? DeviceType.LongExpiry : DeviceType.ShortExpiry,
            },
        })
            .then(() => enqueueSnackbar('Login successful', {variant: 'success'}))
            .catch(handleError('Login failed', enqueueSnackbar));
    };
    return (
        <form noValidate autoComplete="off" onSubmit={submit}>
            <TextField
                required
                margin="dense"
                variant="outlined"
                label="username"
                autoFocus
                fullWidth
                onChange={(e) => setUsername(e.target.value)}
            />
            <TextField
                required
                type="password"
                margin="dense"
                variant="outlined"
                label="password"
                fullWidth
                onChange={(e) => setPassword(e.target.value)}
            />
            <FormControlLabel
                style={{float: 'right'}}
                control={<Checkbox checked={remember} onChange={(e) => setRemember(e.target.checked)} />}
                label="Remember Me"
            />
            <Button type="submit" sx={{marginTop: 1}} fullWidth size="large" onClick={submit} variant="contained" color="primary">
                Login
            </Button>
        </form>
    );
};
