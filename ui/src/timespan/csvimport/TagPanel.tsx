import * as React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import {tagKey} from './importcsv';
import {missingTagGroups, RowResult} from './importstate';
import {Bulk, Paged, PanelProps, Row} from './ImportParts';

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
