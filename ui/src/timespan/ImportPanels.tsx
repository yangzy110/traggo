import * as React from 'react';
import moment from 'moment';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import {endFromDuration, mergeNote, parseTime, tagKey, timeIssue, TIME_TEXT_FORMAT, WorkRow} from './importcsv';
import {ContentAction, ImportState, missingTagGroups, RowResult} from './importstate';

const PAGE = 40;

// Long lists are shown in parts.
const Paged: React.FC<{items: React.ReactNode[]}> = ({items}) => {
    const [shown, setShown] = React.useState(PAGE);
    return (
        <>
            {items.slice(0, shown)}
            {items.length > shown ? (
                <Button fullWidth onClick={() => setShown(shown + PAGE)}>
                    显示更多（还有 {items.length - shown} 行）
                </Button>
            ) : null}
        </>
    );
};

const timeLabel = (iso: string) => moment(iso).format('YYYY-MM-DD HH:mm');

const Row: React.FC<React.PropsWithChildren<{title: string}>> = ({title, children}) => (
    <Paper variant="outlined" sx={{padding: 1.5, marginBottom: 1.5}}>
        <Typography variant="subtitle2" sx={{marginBottom: 0.5}}>
            {title}
        </Typography>
        {children}
    </Paper>
);

const Bulk: React.FC<React.PropsWithChildren<{hint: string}>> = ({hint, children}) => (
    <Alert severity="info" icon={false} sx={{marginBottom: 1.5, alignItems: 'center'}}>
        <Box sx={{display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center'}}>
            <Typography variant="body2" sx={{marginRight: 1}}>
                {hint}
            </Typography>
            {children}
        </Box>
    </Alert>
);

const Summary: React.FC<{row: WorkRow}> = ({row}) => (
    <Typography variant="body2" color="text.secondary">
        {row.note || '（无内容）'}
        {row.tags.length ? ` [${row.tags.join('; ')}]` : ''}
    </Typography>
);

// The two times of a row can be changed.
export const TimeFields: React.FC<{row: WorkRow; onChange: (patch: Partial<WorkRow>) => void}> = ({row, onChange}) => (
    <Box sx={{display: 'flex', gap: 1, flexWrap: 'wrap', marginTop: 1}}>
        {(['start', 'end'] as const).map((field) => (
            <TextField
                key={field}
                size="small"
                label={field === 'start' ? '开始' : '结束'}
                value={row[field]}
                error={!parseTime(row[field])}
                onChange={(e) => onChange({[field]: e.target.value, durationAccepted: false})}
                placeholder={TIME_TEXT_FORMAT}
                sx={{width: 210}}
            />
        ))}
    </Box>
);

interface PanelProps {
    rows: WorkRow[];
    onChangeRow: (line: number, patch: Partial<WorkRow>) => void;
}

// ---- 1. the time ----

export const TimePanel: React.FC<PanelProps & {onChangeAll: (patch: (row: WorkRow) => Partial<WorkRow>) => void}> = ({
    rows,
    onChangeRow,
    onChangeAll,
}) => {
    const mismatched = rows.filter((row) => (timeIssue(row) || {kind: ''}).kind === 'duration');
    return (
        <>
            {mismatched.length > 0 ? (
                <Bulk hint={`${mismatched.length} 行的时长与开始/结束时间不符：`}>
                    <Button size="small" variant="outlined" onClick={() => onChangeAll(() => ({durationAccepted: true}))}>
                        全部以开始/结束时间为准
                    </Button>
                    <Button size="small" variant="outlined" onClick={() => onChangeAll((row) => ({end: endFromDuration(row)}))}>
                        全部以时长为准
                    </Button>
                </Bulk>
            ) : null}
            <Paged
                items={rows.map((row) => {
                    const issue = timeIssue(row);
                    return (
                        <Row key={row.line} title={`第 ${row.line} 行`}>
                            {issue ? (
                                <Typography variant="body2" color="error">
                                    {issue.message}
                                </Typography>
                            ) : (
                                <Typography variant="body2" color="success.main">
                                    已修改，请点击“重新检查”
                                </Typography>
                            )}
                            <Summary row={row} />
                            <TimeFields row={row} onChange={(patch) => onChangeRow(row.line, patch)} />
                            {issue && issue.kind === 'duration' ? (
                                <Box sx={{display: 'flex', gap: 1, marginTop: 1}}>
                                    <Button size="small" onClick={() => onChangeRow(row.line, {durationAccepted: true})}>
                                        以开始/结束时间为准（{issue.calculatedHours} 小时）
                                    </Button>
                                    <Button size="small" onClick={() => onChangeRow(row.line, {end: endFromDuration(row)})}>
                                        以时长为准（{row.durationHours} 小时）
                                    </Button>
                                </Box>
                            ) : null}
                        </Row>
                    );
                })}
            />
        </>
    );
};

// ---- 2. the content ----

interface ContentPanelProps extends PanelProps {
    results: Map<number, RowResult>;
    onResolve: (line: number, action: ContentAction) => void;
    onResolveAll: (action: ContentAction, onlySameTime: boolean) => void;
}

const ConflictInfo: React.FC<{result: RowResult}> = ({result}) => {
    const c = result.conflict!;
    return (
        <Typography variant="body2" color="text.secondary" sx={{marginTop: 0.5}}>
            {c.source === 'Existing' ? '已有记录' : `文件第 ${c.line} 行`}：{timeLabel(c.start)} – {timeLabel(c.end)}，
            {c.note || '（无内容）'}
            {c.tags.length ? ` [${c.tags.join('; ')}]` : ''}
            {c.sameTime ? '' : '（时间只有一部分重叠）'}
        </Typography>
    );
};

export const ContentPanel: React.FC<ContentPanelProps> = ({rows, results, onChangeRow, onResolve, onResolveAll}) => {
    const sameTime = rows.filter((row) => (results.get(row.line)?.conflict || {sameTime: false}).sameTime).length;
    return (
        <>
            <Bulk hint="一次处理所有：">
                <Button size="small" variant="outlined" onClick={() => onResolveAll('skip', false)}>
                    全部保留已有（跳过 {rows.length} 行）
                </Button>
                <Button size="small" variant="outlined" disabled={sameTime === 0} onClick={() => onResolveAll('merge', true)}>
                    时间相同的全部合并内容（{sameTime}）
                </Button>
                <Button size="small" variant="outlined" disabled={sameTime === 0} onClick={() => onResolveAll('overwrite', true)}>
                    时间相同的全部用文件覆盖（{sameTime}）
                </Button>
            </Bulk>
            <Paged
                items={rows.map((row) => {
                    const result = results.get(row.line);
                    if (!result || !result.conflict) {
                        return (
                            <Row key={row.line} title={`第 ${row.line} 行`}>
                                <Typography variant="body2" color="success.main">
                                    已处理，请点击“重新检查”
                                </Typography>
                                <TimeFields row={row} onChange={(patch) => onChangeRow(row.line, patch)} />
                            </Row>
                        );
                    }
                    const same = result.conflict.sameTime;
                    return (
                        <Row key={row.line} title={`第 ${row.line} 行：${row.start} – ${row.end}`}>
                            <Summary row={row} />
                            <ConflictInfo result={result} />
                            <Box sx={{display: 'flex', gap: 1, flexWrap: 'wrap', marginTop: 1}}>
                                <Button size="small" onClick={() => onResolve(row.line, 'skip')}>
                                    保留已有，跳过本行
                                </Button>
                                <Tooltip title={same ? '' : '时间只有一部分重叠，不能合并，请修改时间或跳过'}>
                                    <span>
                                        <Button size="small" disabled={!same} onClick={() => onResolve(row.line, 'merge')}>
                                            合并内容
                                        </Button>
                                        <Button size="small" disabled={!same} onClick={() => onResolve(row.line, 'overwrite')}>
                                            用文件覆盖
                                        </Button>
                                    </span>
                                </Tooltip>
                            </Box>
                            {same ? (
                                <Typography variant="caption" color="text.secondary" sx={{display: 'block', marginTop: 0.5}}>
                                    合并后：{mergeNote(result.conflict.note, row.note) || '（无内容）'}
                                </Typography>
                            ) : null}
                            <TimeFields row={row} onChange={(patch) => onChangeRow(row.line, patch)} />
                        </Row>
                    );
                })}
            />
        </>
    );
};

// ---- 3. the tags ----

interface TagPanelProps extends PanelProps {
    results: Map<number, RowResult>;
    allResults: RowResult[];
    existingTags: string[];
    admin: boolean;
    createTags: string[];
    onMapTag: (from: string, to: string | null) => void;
    onCreateTags: (names: string[]) => void;
}

export const TagPanel: React.FC<TagPanelProps> = ({
    rows,
    allResults,
    existingTags,
    admin,
    createTags,
    onMapTag,
    onCreateTags,
}) => {
    const groups = missingTagGroups(rows, allResults);
    return (
        <>
            {groups.length > 1 || (groups.length === 1 && admin) ? (
                <Bulk hint="一次处理所有缺少的标签：">
                    {admin ? (
                        <Button size="small" variant="outlined" onClick={() => onCreateTags(groups.map((g) => g.name))}>
                            全部创建为公用标签
                        </Button>
                    ) : null}
                    <Button size="small" variant="outlined" onClick={() => groups.forEach((g) => onMapTag(g.name, null))}>
                        从所有行里移除
                    </Button>
                </Bulk>
            ) : null}
            {!admin ? (
                <Alert severity="warning" sx={{marginBottom: 1.5}}>
                    只有管理员可以创建标签。你可以把它们改成已有的标签，或者从行里移除。
                </Alert>
            ) : null}
            {groups.map(({name, lines}) => (
                <Row
                    key={name}
                    title={`标签“${name}”不存在（${lines.length} 行使用，第 ${lines.slice(0, 8).join('、')} 行${lines.length > 8 ? '等' : ''}）`}>
                    <Box sx={{display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center'}}>
                        <TextField
                            select
                            size="small"
                            label="改成已有的标签"
                            value=""
                            onChange={(e) => onMapTag(name, e.target.value)}
                            sx={{minWidth: 180}}>
                            {existingTags.map((tag) => (
                                <MenuItem key={tag} value={tag}>
                                    {tag}
                                </MenuItem>
                            ))}
                        </TextField>
                        <Button size="small" onClick={() => onMapTag(name, null)}>
                            从这些行里移除
                        </Button>
                        {admin ? (
                            <Button size="small" disabled={createTags.includes(name)} onClick={() => onCreateTags([name])}>
                                {createTags.includes(name) ? '将创建（公用）' : '创建这个标签'}
                            </Button>
                        ) : null}
                    </Box>
                </Row>
            ))}
            <Paged
                items={rows.map((row) => {
                    const result = allResults.find((r) => r.line === row.line);
                    return (
                        <Paper key={row.line} variant="outlined" sx={{padding: 1, marginBottom: 1}}>
                            <Typography variant="body2">
                                第 {row.line} 行：{row.start} – {row.end}，{row.note || '（无内容）'}
                            </Typography>
                            <Box sx={{display: 'flex', gap: 0.5, flexWrap: 'wrap', marginTop: 0.5}}>
                                {row.tags.map((label) => {
                                    const missing = !!result && result.missingTags.includes(tagKey(label));
                                    return (
                                        <Chip
                                            key={label}
                                            size="small"
                                            color={missing ? 'warning' : 'default'}
                                            variant={missing ? 'filled' : 'outlined'}
                                            label={label}
                                            onDelete={missing ? () => onMapTag(tagKey(label), null) : undefined}
                                        />
                                    );
                                })}
                            </Box>
                        </Paper>
                    );
                })}
            />
        </>
    );
};

// ---- the rows which can be imported ----

export const ReadyPanel: React.FC<{
    rows: WorkRow[];
    results: Map<number, RowResult>;
    state: ImportState;
}> = ({rows, results, state}) => {
    const isDuplicate = (row: WorkRow) => results.get(row.line)?.status === 'Duplicate';
    const ok = rows.filter((row) => !isDuplicate(row));
    const duplicates = rows.filter(isDuplicate);
    const readyLine = (row: WorkRow, duplicate: boolean) => (
        <Box
            key={row.line}
            sx={{display: 'flex', gap: 1, alignItems: 'baseline', padding: '4px 0', opacity: duplicate ? 0.6 : 1}}>
            <Typography variant="caption" color="text.secondary" sx={{minWidth: 44}}>
                第 {row.line} 行
            </Typography>
            <Typography variant="body2">
                {row.start} – {row.end}，{row.note || '（无内容）'}
                {row.tags.length ? ` [${row.tags.join('; ')}]` : ''}
            </Typography>
        </Box>
    );
    return (
        <>
            {state.updates.length > 0 ? (
                <Alert severity="info" sx={{marginBottom: 1.5}}>
                    将更新 {state.updates.length} 条已有记录的内容和标签。
                </Alert>
            ) : null}
            <Typography variant="subtitle2" sx={{marginBottom: 0.5}}>
                可导入（{ok.length}）
            </Typography>
            <Paged items={ok.map((row) => readyLine(row, false))} />
            {duplicates.length > 0 ? (
                <>
                    <Typography variant="subtitle2" sx={{marginTop: 2, marginBottom: 0.5}}>
                        已存在，会跳过（{duplicates.length}）
                    </Typography>
                    <Paged items={duplicates.map((row) => readyLine(row, true))} />
                </>
            ) : null}
        </>
    );
};
