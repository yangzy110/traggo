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
            .then(() => enqueueSnackbar('标签已删除', {variant: 'success'}))
            .catch(handleError('删除标签失败', enqueueSnackbar));
    };

    const onClickShare = () => {
        const tag = data.tags!.find((t) => t.key === shareTagConfirm);
        if (!tag) {
            return;
        }
        return updateTag({variables: {key: tag.key, color: tag.color, shared: true}})
            .then(() => enqueueSnackbar('标签已共享给所有用户', {variant: 'success'}))
            .catch(handleError('共享标签失败', enqueueSnackbar));
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
                .then(() => enqueueSnackbar('标签已更新', {variant: 'success'}))
                .catch(handleError('编辑标签失败', enqueueSnackbar));
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
                                <Chip size="small" variant="outlined" color="primary" label="公用" sx={{ml: 1, height: 22}} />
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
                            <IconButton onClick={onClickSubmit} title="保存">
                                <DoneIcon />
                            </IconButton>
                            <IconButton onClick={() => setEditing(['', '', ''])} title="取消">
                                <CloseIcon />
                            </IconButton>
                        </>
                    ) : tag.editable ? (
                        <>
                            {admin && !tag.shared ? (
                                <IconButton onClick={() => setShareTagConfirm(tag.key)} title="共享给所有用户">
                                    <ShareIcon />
                                </IconButton>
                            ) : null}
                            <IconButton onClick={() => setEditing([tag.key, tag.key, tag.color])} title="编辑">
                                <EditIcon />
                            </IconButton>
                            <IconButton onClick={() => setRemoveTagConfirm(tag.key)} title="删除">
                                <DeleteIcon />
                            </IconButton>
                        </>
                    ) : (
                        <Tooltip title="公用标签：所有人可用，但只有管理员可以修改">
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
                创建标签
            </Button>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>标签</TableCell>
                        <TableCell>颜色</TableCell>
                        <TableCell style={{width: 100}}>使用次数</TableCell>
                        <TableCell style={{width: 200}} />
                    </TableRow>
                </TableHead>
                <TableBody>
                    {addActive ? <AddTagDialog initialName={''} open={true} close={() => setAddActive(false)} /> : null}
                    {tags}
                    {removeTagConfirm ? (
                        <ConfirmDialog
                            title={`删除标签 ${removeTagConfirm}`}
                            fClose={() => setRemoveTagConfirm('')}
                            fOnSubmit={onClickDelete}>
                            <b>此操作无法撤销。</b>{' '}
                            {removeTagIsShared
                                ? 'Deleting the shared tag will remove all references in the time spans of all users.'
                                : 'Deleting the tag will remove all references in time spans.'}
                        </ConfirmDialog>
                    ) : null}
                    {shareTagConfirm ? (
                        <ConfirmDialog
                            title={`共享标签 ${shareTagConfirm}`}
                            fClose={() => setShareTagConfirm('')}
                            fOnSubmit={onClickShare}>
                            共享后所有用户都可以使用该标签，只有管理员可以修改或删除。 <b>公用标签无法再改回私有。</b>
                        </ConfirmDialog>
                    ) : null}
                </TableBody>
            </Table>
        </Paper>
    );
};
