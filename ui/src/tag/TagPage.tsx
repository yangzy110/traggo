import * as React from 'react';
import Paper from '@mui/material/Paper';
import {useMutation, useQuery} from '@apollo/client/react';
import * as gqlTag from '../gql/tags';
import * as gqlDashboard from '../gql/dashboard';
import * as gqlUser from '../gql/user';
import {CenteredSpinner} from '../common/CenteredSpinner';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ShareIcon from '@mui/icons-material/Public';
import LockIcon from '@mui/icons-material/Lock';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import DoneIcon from '@mui/icons-material/Done';
import CloseIcon from '@mui/icons-material/Close';
import IconButton from '@mui/material/IconButton';
import {useSnackbar} from 'notistack';
import {TextField} from '@mui/material';
import Button from '@mui/material/Button';
import {Tags, RemoveTag, RemoveTagVariables, UpdateTag, UpdateTagVariables, CurrentUser} from '../gql/types';
import {AddTagDialog} from './AddTagDialog';
import {SliderPicker} from 'react-color';
import {TagChip} from '../common/TagChip';
import {handleError} from '../utils/errors';
import {ConfirmDialog} from '../common/ConfirmDialog';
import type {SxProps, Theme as MuiTheme} from '@mui/material/styles';
import {gutters} from '../common/styles';

const rootSx: SxProps<MuiTheme> = (theme) => ({
    ...gutters(theme),
    paddingTop: theme.spacing(3),
    paddingBottom: theme.spacing(3),
    textAlign: 'center',
    maxWidth: 1200,
    margin: '0 auto',
});

export const TagPage = () => {
    const {data, loading} = useQuery<Tags>(gqlTag.Tags);
    const {data: currentUser} = useQuery<CurrentUser>(gqlUser.CurrentUser);
    const admin = !!(currentUser && currentUser.user && currentUser.user.admin);
    const [removeTagConfirm, setRemoveTagConfirm] = React.useState('');
    const [shareTagConfirm, setShareTagConfirm] = React.useState('');
    const refetch = {refetchQueries: [{query: gqlTag.Tags}, {query: gqlDashboard.Dashboards}]};
    const {enqueueSnackbar} = useSnackbar();
    const [removeTag] = useMutation<RemoveTag, RemoveTagVariables>(gqlTag.RemoveTag, refetch);
    const [[editKey, editKeyNew, editColor], setEditing] = React.useState<[string, string, string]>(['', '', '']);
    const [addActive, setAddActive] = React.useState(false);
    const [updateTag] = useMutation<UpdateTag, UpdateTagVariables>(gqlTag.UpdateTag, refetch);
    if (loading || !data || !data.tags) {
        return <CenteredSpinner />;
    }
    const onClickDelete = () => {
        return removeTag({variables: {key: removeTagConfirm}})
            .then(() => enqueueSnackbar('tag deleted', {variant: 'success'}))
            .catch(handleError('Delete Tag', enqueueSnackbar));
    };

    const onClickShare = () => {
        const tag = data.tags!.find((t) => t.key === shareTagConfirm);
        if (!tag) {
            return;
        }
        return updateTag({variables: {key: tag.key, color: tag.color, shared: true}})
            .then(() => enqueueSnackbar('tag shared with all users', {variant: 'success'}))
            .catch(handleError('Share Tag', enqueueSnackbar));
    };
    const removeTagIsShared = !!data.tags.find((t) => t.key === removeTagConfirm && t.shared);

    const tags = data.tags.map((tag) => {
        const onClickSubmit = () => {
            setEditing(['', '', '']);
            updateTag({
                variables: {
                    key: editKey,
                    newKey: editKeyNew,
                    color: editColor,
                },
            })
                .then(() => enqueueSnackbar('tag edited', {variant: 'success'}))
                .catch(handleError('Edit Tag', enqueueSnackbar));
        };
        const isEdited = editKey === tag.key;
        return (
            <TableRow key={tag.key}>
                <TableCell>
                    {isEdited ? (
                        <TextField
                            variant="standard"
                            value={editKeyNew}
                            onChange={(e) => setEditing([editKey, e.target.value, editColor])}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    onClickSubmit();
                                }
                            }}
                            onSubmit={onClickSubmit}
                            style={{minWidth: 128}}
                        />
                    ) : (
                        <>
                            {tag.key}
                            {tag.shared ? (
                                <Chip size="small" variant="outlined" color="primary" label="shared" sx={{ml: 1, height: 22}} />
                            ) : null}
                        </>
                    )}
                </TableCell>
                <TableCell style={{minWidth: 128}}>
                    {isEdited ? (
                        <SliderPicker onChange={(c) => setEditing([editKey, editKeyNew, c.hex])} color={editColor} />
                    ) : (
                        <TagChip label={tag.color} color={tag.color} />
                    )}
                </TableCell>
                <TableCell align="right">{tag.usages}</TableCell>
                <TableCell align="right" sx={{whiteSpace: 'nowrap'}}>
                    {isEdited ? (
                        <>
                            <IconButton onClick={onClickSubmit} title="Save">
                                <DoneIcon />
                            </IconButton>
                            <IconButton onClick={() => setEditing(['', '', ''])} title="Cancel">
                                <CloseIcon />
                            </IconButton>
                        </>
                    ) : tag.editable ? (
                        <>
                            {admin && !tag.shared ? (
                                <IconButton onClick={() => setShareTagConfirm(tag.key)} title="Share with all users">
                                    <ShareIcon />
                                </IconButton>
                            ) : null}
                            <IconButton onClick={() => setEditing([tag.key, tag.key, tag.color])} title="Edit">
                                <EditIcon />
                            </IconButton>
                            <IconButton onClick={() => setRemoveTagConfirm(tag.key)} title="Delete">
                                <DeleteIcon />
                            </IconButton>
                        </>
                    ) : (
                        <Tooltip title="Shared tag: it can be used by everyone, but only admins can change it">
                            <LockIcon fontSize="small" color="disabled" sx={{mr: 1.5, verticalAlign: 'middle'}} />
                        </Tooltip>
                    )}
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
                onClick={() => setAddActive(true)}
                fullWidth
                style={{marginBottom: 10}}>
                Create Tag
            </Button>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>Key</TableCell>
                        <TableCell>Color</TableCell>
                        <TableCell style={{width: 100}}>Usages</TableCell>
                        <TableCell style={{width: 200}} />
                    </TableRow>
                </TableHead>
                <TableBody>
                    {addActive ? <AddTagDialog initialName={''} open={true} close={() => setAddActive(false)} /> : null}
                    {tags}
                    {removeTagConfirm ? (
                        <ConfirmDialog
                            title={`Delete Tag ${removeTagConfirm}`}
                            fClose={() => setRemoveTagConfirm('')}
                            fOnSubmit={onClickDelete}>
                            <b>This operation cannot be undone.</b>{' '}
                            {removeTagIsShared
                                ? 'Deleting the shared tag will remove all references in the time spans of all users.'
                                : 'Deleting the tag will remove all references in time spans.'}
                        </ConfirmDialog>
                    ) : null}
                    {shareTagConfirm ? (
                        <ConfirmDialog
                            title={`Share Tag ${shareTagConfirm}`}
                            fClose={() => setShareTagConfirm('')}
                            fOnSubmit={onClickShare}>
                            All users can use the tag afterwards and only admins can change or delete it.{' '}
                            <b>A shared tag cannot be made private again.</b>
                        </ConfirmDialog>
                    ) : null}
                </TableBody>
            </Table>
        </Paper>
    );
};
