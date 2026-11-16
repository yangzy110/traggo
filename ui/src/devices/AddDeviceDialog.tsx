import * as React from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import * as gqlDevice from '../gql/device';
import {useMutation} from '@apollo/client/react';
import {CreateDevice, CreateDeviceVariables, DeviceType} from '../gql/types';
import {useSnackbar} from 'notistack';
import {handleError} from '../utils/errors';
import {deviceTypeToString} from './typeutils';

interface AddTagDialogProps {
    initialName: string;
    open: boolean;
    close: () => void;
}

export const AddDeviceDialog: React.FC<AddTagDialogProps> = ({close, open, initialName}) => {
    const [token, setToken] = React.useState('');
    const [name, setName] = React.useState(initialName);
    const [deviceType, setDeviceType] = React.useState(DeviceType.NoExpiry);
    const {enqueueSnackbar} = useSnackbar();

    const [addDevice] = useMutation<CreateDevice, CreateDeviceVariables>(gqlDevice.CreateDevice, {
        refetchQueries: [{query: gqlDevice.Devices}],
    });
    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        addDevice({variables: {deviceType, name}})
            .then((result) => {
                if (result.data && result.data.device) {
                    enqueueSnackbar('设备已创建', {variant: 'success'});
                    setToken(result.data.device.token);
                }
            })
            .catch(handleError('创建设备失败', enqueueSnackbar));
    };

    return (
        <Dialog
            open={open}
            onClose={() => {
                if (token === '') {
                    close();
                }
            }}
            aria-labelledby="form-dialog-title"
            fullWidth>
            {token === '' ? (
                <form onSubmit={submit} noValidate autoComplete="off">
                    <DialogTitle id="form-dialog-title">创建设备</DialogTitle>
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
                        <TextField
                            select
                            label="过期时间"
                            margin="normal"
                            fullWidth
                            slotProps={{select: {native: true}}}
                            value={deviceType}
                            onChange={(e) => setDeviceType(e.target.value as DeviceType)}>
                            <option value={DeviceType.NoExpiry}>{deviceTypeToString(DeviceType.NoExpiry)}</option>
                            <option value={DeviceType.ShortExpiry}>{deviceTypeToString(DeviceType.ShortExpiry)}</option>
                            <option value={DeviceType.LongExpiry}>{deviceTypeToString(DeviceType.LongExpiry)}</option>
                        </TextField>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={close} color="primary">
                            取消
                        </Button>
                        <Button type="submit" onClick={submit} color="primary">
                            创建设备
                        </Button>
                    </DialogActions>
                </form>
            ) : (
                <>
                    <DialogTitle id="form-dialog-title">设备已创建</DialogTitle>
                    <DialogContent>
                        <DialogContentText>
                            该设备的认证令牌如下，请复制并妥善保存，关闭此对话框后将无法再次查看 。
                            <br /> <b>{token}</b>
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={close} color="primary">
                            关闭
                        </Button>
                    </DialogActions>
                </>
            )}
        </Dialog>
    );
};
