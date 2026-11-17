import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import {endFromDuration, timeIssue, WorkRow} from './importcsv';
import {Bulk, Paged, PanelProps, Row, Summary, TimeFields} from './ImportParts';

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
