import * as React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import {WorkRow} from './importcsv';
import {ImportState, RowResult} from './importstate';
import {Paged} from './ImportParts';

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
