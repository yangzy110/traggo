import * as React from 'react';
import Paper from '@mui/material/Paper';
import {useMutation, useQuery} from '@apollo/client/react';
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
import * as gqlDashboard from '../gql/dashboard';
import {TextField} from '@mui/material';
import Button from '@mui/material/Button';
import {Dashboards, RemoveDashboard, RemoveDashboardVariables, UpdateDashboard, UpdateDashboardVariables} from '../gql/types';
import {AddDashboardDialog} from './AddDashboardDialog';
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

const NoEdit = [-1, ''] as const;

export const DashboardsPage = () => {
    const {loading, data} = useQuery<Dashboards>(gqlDashboard.Dashboards);
    const [addDashboard, setAddDashboard] = React.useState(false);
    const [removeDashboardConfirm, setRemoveDashboardConfirm] = React.useState<false | [number, string]>(false);
    const refetch = {refetchQueries: [{query: gqlDashboard.Dashboards}]};
    const {enqueueSnackbar} = useSnackbar();
    const [removeDashboard] = useMutation<RemoveDashboard, RemoveDashboardVariables>(gqlDashboard.RemoveDashboard, refetch);
    const [[editId, editName], setEditing] = React.useState<Readonly<[number, string]>>(NoEdit);
    const [updateDashboard] = useMutation<UpdateDashboard, UpdateDashboardVariables>(gqlDashboard.UpdateDashboard, refetch);
    if (loading || !data || !data.dashboards) {
        return <CenteredSpinner />;
    }
    const onClickDelete = () => {
        if (removeDashboardConfirm) {
            removeDashboard({variables: {id: removeDashboardConfirm[0]}}).then(() =>
                enqueueSnackbar('dashboard deleted', {variant: 'success'})
            );
        }
    };

    const dashboards = data.dashboards.map((dashboard) => {
        const onClickSubmit = () => {
            setEditing(NoEdit);
            updateDashboard({
                variables: {
                    id: editId,
                    name: editName,
                },
            }).then(() => enqueueSnackbar('dashboard edited', {variant: 'success'}));
        };
        const isEdited = editId === dashboard.id;
        return (
            <TableRow key={dashboard.id}>
                <TableCell>{dashboard.id}</TableCell>
                <TableCell>
                    {isEdited ? (
                        <TextField
                            variant="standard"
                            value={editName}
                            onChange={(e) => setEditing([editId, e.target.value])}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    onClickSubmit();
                                }
                            }}
                            onSubmit={onClickSubmit}
                        />
                    ) : (
                        dashboard.name
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
                            <IconButton onClick={() => setEditing([dashboard.id, dashboard.name])} title="Edit">
                                <EditIcon />
                            </IconButton>
                            <IconButton onClick={() => setRemoveDashboardConfirm([dashboard.id, dashboard.name])} title="Delete">
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
                onClick={() => setAddDashboard(true)}
                fullWidth
                style={{marginBottom: 10}}>
                Create Dashboard
            </Button>
            {addDashboard && <AddDashboardDialog open={true} close={() => setAddDashboard(false)} />}
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>ID</TableCell>
                        <TableCell>Name</TableCell>
                        <TableCell style={{width: 150}} />
                    </TableRow>
                </TableHead>
                <TableBody>{dashboards}</TableBody>
            </Table>
            {removeDashboardConfirm ? (
                <ConfirmDialog
                    title={`Delete Dashboard ${removeDashboardConfirm[1]}`}
                    fClose={() => setRemoveDashboardConfirm(false)}
                    fOnSubmit={onClickDelete}>
                    <b>This operation cannot be undone.</b> Deleting the dashboard will remove all its dashboard entries.
                </ConfirmDialog>
            ) : null}
        </Paper>
    );
};
