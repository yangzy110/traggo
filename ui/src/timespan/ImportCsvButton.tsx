import * as React from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import UndoIcon from '@mui/icons-material/Undo';
import UploadIcon from '@mui/icons-material/Upload';
import {changeTag} from './importstate';
import {ImportBody} from './ImportBody';
import {DoneStep, PickStep} from './ImportSteps';
import {useImportFlow} from './useImportFlow';

// Imports a csv file: choose a file, solve the problems of the rows in tabs (time, content, tags), check again and import.
// The server checks everything again before it writes.
export const ImportCsvButton: React.FC<{onImported: () => void}> = ({onImported}) => {
    const {
        open,
        setOpen,
        step,
        fileName,
        setFileName,
        error,
        state,
        createTags,
        dirty,
        busy,
        tab,
        setTab,
        history,
        confirmClose,
        setConfirmClose,
        done,
        resultMap,
        results,
        tabs,
        rowsOf,
        counts,
        duplicates,
        problems,
        importable,
        admin,
        existingTags,
        reset,
        onFile,
        change,
        undo,
        changeRow,
        changeRowsOfTab,
        resolve,
        downloadLeft,
        doImport,
        close,
        left,
        runCheck,
    } = useImportFlow(onImported);

    return (
        <>
            <Button
                variant="outlined"
                startIcon={<UploadIcon />}
                onClick={() => {
                    reset();
                    setFileName('');
                    setOpen(true);
                }}>
                导入 CSV
            </Button>
            <Dialog open={open} onClose={() => !busy && close()} fullWidth maxWidth="md">
                <DialogTitle>导入 CSV{fileName && step !== 'pick' ? `：${fileName}` : ''}</DialogTitle>
                <DialogContent sx={{minHeight: step === 'review' ? 420 : undefined}}>
                    {step === 'pick' ? busy ? <CircularProgress size={24} /> : <PickStep onFile={onFile} error={error} /> : null}
                    {step === 'review' && error ? <Alert severity="error">{error}</Alert> : null}
                    {step === 'review' ? (
                        <ImportBody
                            tab={tab}
                            onTab={setTab}
                            counts={counts}
                            problems={problems}
                            duplicates={duplicates}
                            dirty={dirty}
                            state={state}
                            results={results}
                            resultMap={resultMap}
                            tabs={tabs}
                            admin={admin}
                            existingTags={existingTags}
                            createTags={createTags}
                            rowsOf={rowsOf}
                            onChangeRow={changeRow}
                            onChangeRowsOfTab={changeRowsOfTab}
                            onResolve={resolve}
                            onChange={change}
                            onMapTag={(from, to) =>
                                change(
                                    {...state, rows: changeTag(state.rows, from, to)},
                                    createTags.filter((n) => n !== from)
                                )
                            }
                            onCreateTags={(names) => change(state, [...new Set([...createTags, ...names])])}
                        />
                    ) : null}
                    {step === 'done' ? (
                        <DoneStep
                            imported={done.imported}
                            updated={done.updated}
                            duplicates={duplicates}
                            left={left}
                            onDownloadLeft={downloadLeft}
                        />
                    ) : null}
                </DialogContent>
                <ImportActions
                    step={step}
                    busy={busy}
                    dirty={dirty}
                    canUndo={history.length > 0}
                    hasProblems={problems > 0}
                    canImport={importable > 0 || state.updates.length > 0}
                    label={`导入 ${importable} 条${state.updates.length ? `，更新 ${state.updates.length} 条` : ''}`}
                    onUndo={undo}
                    onDownloadLeft={downloadLeft}
                    onClose={step === 'done' ? () => setOpen(false) : close}
                    onCheck={() => runCheck(state, createTags)}
                    onImport={doImport}
                />
            </Dialog>
            <Dialog open={confirmClose} onClose={() => setConfirmClose(false)}>
                <DialogTitle>放弃这次导入？</DialogTitle>
                <DialogContent>
                    <DialogContentText>你已经做的修改不会保存。如果只是想休息一下，请先下载“有问题的行”。</DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmClose(false)}>继续处理</Button>
                    <Button
                        color="error"
                        onClick={() => {
                            setConfirmClose(false);
                            setOpen(false);
                        }}>
                        放弃
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

const ImportActions: React.FC<{
    step: 'pick' | 'review' | 'done';
    busy: boolean;
    dirty: boolean;
    canUndo: boolean;
    hasProblems: boolean;
    canImport: boolean;
    label: string;
    onUndo: () => void;
    onDownloadLeft: () => void;
    onClose: () => void;
    onCheck: () => void;
    onImport: () => void;
}> = (p) => (
    <DialogActions>
        {p.step === 'review' ? (
            <>
                <Button startIcon={<UndoIcon />} disabled={p.busy || !p.canUndo} onClick={p.onUndo}>
                    撤销上一步
                </Button>
                {p.hasProblems ? <Button onClick={p.onDownloadLeft}>下载有问题的行</Button> : null}
                <span style={{flexGrow: 1}} />
            </>
        ) : null}
        <Button disabled={p.busy} onClick={p.onClose}>
            {p.step === 'done' ? '关闭' : '取消'}
        </Button>
        {p.step === 'review' ? (
            <>
                <Button variant={p.dirty ? 'contained' : 'outlined'} disabled={p.busy || !p.dirty} onClick={p.onCheck}>
                    提交修改并重新检查
                </Button>
                <Button variant="contained" disabled={p.busy || p.dirty || !p.canImport} onClick={p.onImport}>
                    {p.label}
                </Button>
            </>
        ) : null}
    </DialogActions>
);
