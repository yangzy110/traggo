import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import {mergeNote} from './importcsv';
import {ContentAction, RowResult} from './importstate';
import {Bulk, Paged, PanelProps, Row, Summary, timeLabel, TimeFields} from './ImportParts';

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
