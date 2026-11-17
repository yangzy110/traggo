import Typography from '@mui/material/Typography';
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
import ArchiveIcon from '@mui/icons-material/Inventory2Outlined';
import UnarchiveIcon from '@mui/icons-material/Unarchive';
import EditIcon from '@mui/icons-material/Edit';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import {useSnackbar} from 'notistack';
import Button from '@mui/material/Button';
import {Tags, RemoveTag, RemoveTagVariables, ArchiveTag, ArchiveTagVariables, CurrentUser} from '../gql/types';
import {TagDialog} from './TagDialog';
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
    const refetch = {refetchQueries: [{query: gqlTag.Tags}, {query: gqlDashboard.Dashboards}]};
    const {enqueueSnackbar} = useSnackbar();
    const [removeTag] = useMutation<RemoveTag, RemoveTagVariables>(gqlTag.RemoveTag, refetch);
    const [archiveTag] = useMutation<ArchiveTag, ArchiveTagVariables>(gqlTag.ArchiveTag, refetch);
    // the tag which is edited, the dialog is also used to create a tag
    const [dialog, setDialog] = React.useState<false | 'new' | {key: string; color: string}>(false);
    if (loading || !data || !data.tags) {
        return <CenteredSpinner />;
    }
    const onArchive = (key: string, archived: boolean) =>
        archiveTag({variables: {key, archived}})
            .then(() => enqueueSnackbar(archived ? '标签已停用' : '标签已恢复', {variant: 'success'}))
            .catch(handleError(archived ? '停用标签失败' : '恢复标签失败', enqueueSnackbar));
    const onClickDelete = () => {
        return removeTag({variables: {key: removeTagConfirm}})
            .then(() => enqueueSnackbar('标签已删除', {variant: 'success'}))
            .catch(handleError('删除标签失败', enqueueSnackbar));
    };

    const removeTagDefinition = data.tags.find((t) => t.key === removeTagConfirm);
    const removeTagUsages = removeTagDefinition ? removeTagDefinition.usages : 0;

    const tags = data.tags.map((tag) => (
        <TableRow key={tag.key}>
            <TableCell>
                {tag.key}
                {tag.archived ? (
                    <Chip size="small" variant="outlined" label="已停用" sx={{ml: 1, height: 22, opacity: 0.8}} />
                ) : null}
            </TableCell>
            <TableCell style={{minWidth: 128}}>
                <TagChip label={tag.key} color={tag.color} />
            </TableCell>
            <TableCell align="right">{tag.usages}</TableCell>
            {admin ? (
                <TableCell align="right" sx={{whiteSpace: 'nowrap'}}>
                    <IconButton onClick={() => setDialog({key: tag.key, color: tag.color})} title="编辑">
                        <EditIcon />
                    </IconButton>
                    <IconButton
                        onClick={() => onArchive(tag.key, !tag.archived)}
                        title={tag.archived ? '恢复使用' : '停用（历史记录保留）'}>
                        {tag.archived ? <UnarchiveIcon /> : <ArchiveIcon />}
                    </IconButton>
                    <IconButton onClick={() => setRemoveTagConfirm(tag.key)} title="删除">
                        <DeleteIcon />
                    </IconButton>
                </TableCell>
            ) : null}
        </TableRow>
    ));

    return (
        <Paper elevation={1} sx={rootSx}>
            {admin ? (
                <Button
                    color={'primary'}
                    variant={'outlined'}
                    size="small"
                    onClick={() => setDialog('new')}
                    fullWidth
                    style={{marginBottom: 10}}>
                    创建标签
                </Button>
            ) : (
                <Typography color="textSecondary" sx={{marginBottom: 1.5}}>
                    标签由管理员创建，所有人都可以在记录里选择它们。
                </Typography>
            )}
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>标签</TableCell>
                        <TableCell>颜色</TableCell>
                        <TableCell style={{width: 100}}>使用次数</TableCell>
                        {admin ? <TableCell style={{width: 150}} /> : null}
                    </TableRow>
                </TableHead>
                <TableBody>{tags}</TableBody>
            </Table>
            {dialog === 'new' ? <TagDialog open={true} close={() => setDialog(false)} /> : null}
            {dialog && dialog !== 'new' ? (
                <TagDialog key={dialog.key} tag={dialog} open={true} close={() => setDialog(false)} />
            ) : null}
            {removeTagConfirm && removeTagUsages > 0 ? (
                <ConfirmDialog
                    title={`标签 ${removeTagConfirm} 不能删除`}
                    fClose={() => setRemoveTagConfirm('')}
                    fOnSubmit={() => onArchive(removeTagConfirm, true)}>
                    这个标签关联着 <b>{removeTagUsages}</b> 条记录，为了保留历史记录，已使用的标签不能删除。是否改为<b>停用</b>
                    ？停用后不能再用于新的记录，已有记录不受影响，之后可以恢复。
                </ConfirmDialog>
            ) : null}
            {removeTagConfirm && removeTagUsages === 0 ? (
                <ConfirmDialog
                    title={`删除标签 ${removeTagConfirm}`}
                    fClose={() => setRemoveTagConfirm('')}
                    fOnSubmit={onClickDelete}>
                    <b>此操作无法撤销。</b> 这个标签没有关联任何记录。
                </ConfirmDialog>
            ) : null}
        </Paper>
    );
};
