import * as React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import {WorkRow} from './importcsv';
import {ContentAction, ImportState, resolveAllContent, RowResult, Tab as TabName} from './importstate';
import {ContentPanel} from './ContentPanel';
import {ReadyPanel} from './ReadyPanel';
import {TagPanel} from './TagPanel';
import {TimePanel} from './TimePanel';

const TAB_LABEL: Record<TabName, string> = {time: '时间问题', content: '内容问题', tags: '标签问题', ready: '可导入'};
export const TAB_ORDER: TabName[] = ['time', 'content', 'tags', 'ready'];

interface ImportBodyProps {
    tab: TabName;
    onTab: (tab: TabName) => void;
    counts: Record<TabName, number>;
    problems: number;
    duplicates: number;
    dirty: boolean;
    state: ImportState;
    results: RowResult[];
    resultMap: Map<number, RowResult>;
    tabs: Map<number, TabName>;
    admin: boolean;
    existingTags: string[];
    createTags: string[];
    rowsOf: (tab: TabName) => WorkRow[];
    onChangeRow: (line: number, patch: Partial<WorkRow>) => void;
    onChangeRowsOfTab: (tab: TabName, patch: (row: WorkRow) => Partial<WorkRow>) => void;
    onResolve: (line: number, action: ContentAction) => void;
    onChange: (state: ImportState) => void;
    onMapTag: (from: string, to: string | null) => void;
    onCreateTags: (names: string[]) => void;
}

// The tabs of the problems (time, content, tags) and of the rows which can be imported.
export const ImportBody: React.FC<ImportBodyProps> = ({
    tab,
    onTab,
    counts,
    problems,
    duplicates,
    dirty,
    state,
    results,
    resultMap,
    tabs,
    admin,
    existingTags,
    createTags,
    rowsOf,
    onChangeRow,
    onChangeRowsOfTab,
    onResolve,
    onChange,
    onMapTag,
    onCreateTags,
}) => (
    <>
        <Box sx={{display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', marginBottom: 1.5}}>
            <Typography variant="body2" sx={{marginRight: 0.5}}>
                共 {state.rows.length + state.handled.length} 行：
            </Typography>
            <Chip
                size="small"
                color="success"
                variant="outlined"
                label={`可导入 ${counts.ready - duplicates}`}
                onClick={() => onTab('ready')}
            />
            {duplicates > 0 ? (
                <Chip size="small" variant="outlined" label={`已存在 ${duplicates}`} onClick={() => onTab('ready')} />
            ) : null}
            {problems > 0 ? <Chip size="small" color="warning" label={`有问题 ${problems}（不会被导入）`} /> : null}
        </Box>
        <Tabs value={tab} onChange={(_, value) => onTab(value)} sx={{marginBottom: 2}}>
            {TAB_ORDER.map((name) => (
                <Tab
                    key={name}
                    value={name}
                    label={counts[name] > 0 ? `${TAB_LABEL[name]}（${counts[name]}）` : TAB_LABEL[name]}
                />
            ))}
        </Tabs>
        {dirty ? (
            <Alert severity="warning" sx={{marginBottom: 1.5}}>
                有还没有检查的修改，请点击下面的“提交修改并重新检查”，检查通过后才能导入。
            </Alert>
        ) : null}
        {tab === 'time' ? (
            <TimePanel
                rows={rowsOf('time')}
                onChangeRow={onChangeRow}
                onChangeAll={(patch) => onChangeRowsOfTab('time', patch)}
            />
        ) : null}
        {tab === 'content' ? (
            <ContentPanel
                rows={rowsOf('content')}
                results={resultMap}
                onChangeRow={onChangeRow}
                onResolve={onResolve}
                onResolveAll={(action, onlySameTime) =>
                    onChange(
                        resolveAllContent(
                            state,
                            results.filter((r) => tabs.get(r.line) === 'content'),
                            action,
                            onlySameTime
                        )
                    )
                }
            />
        ) : null}
        {tab === 'tags' ? (
            <TagPanel
                rows={rowsOf('tags')}
                results={resultMap}
                allResults={results}
                onChangeRow={onChangeRow}
                existingTags={existingTags}
                admin={admin}
                createTags={createTags}
                onMapTag={onMapTag}
                onCreateTags={onCreateTags}
            />
        ) : null}
        {tab === 'ready' ? <ReadyPanel rows={rowsOf('ready')} results={resultMap} state={state} /> : null}
        {counts[tab] === 0 && tab !== 'ready' ? (
            <Box sx={{textAlign: 'center', color: 'text.secondary', marginTop: 4}}>这里没有问题了</Box>
        ) : null}
    </>
);
