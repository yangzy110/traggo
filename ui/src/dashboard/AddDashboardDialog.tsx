import * as React from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import {useMutation} from '@apollo/client/react';
import {useSnackbar} from 'notistack';
import {handleError} from '../utils/errors';
import * as gqlDashboard from '../gql/dashboard';
import {CreateDashboard, CreateDashboardVariables} from '../gql/types';

interface AddTagDialogProps {
    open: boolean;
    close: () => void;
}

export const AddDashboardDialog: React.FC<AddTagDialogProps> = ({close, open}) => {
    const [name, setName] = React.useState('');
    const {enqueueSnackbar} = useSnackbar();

    const [addUser] = useMutation<CreateDashboard, CreateDashboardVariables>(gqlDashboard.CreateDashboard, {
        refetchQueries: [{query: gqlDashboard.Dashboards}],
    });
    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        addUser({variables: {name}})
            .then(() => {
                enqueueSnackbar('仪表盘已创建', {variant: 'success'});
                close();
            })
            .catch(handleError('创建仪表盘失败', enqueueSnackbar));
    };

    return (
        <Dialog open={open} onClose={close} aria-labelledby="form-dialog-title" fullWidth>
            <form onSubmit={submit} noValidate autoComplete="off">
                <DialogTitle id="form-dialog-title">创建仪表盘</DialogTitle>
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
                </DialogContent>
                <DialogActions>
                    <Button onClick={close} color="primary">
                        取消
                    </Button>
                    <Button type="submit" onClick={submit} color="primary">
                        创建仪表盘
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
};
