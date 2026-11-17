import * as React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import {MAX_IMPORT_ROWS} from './importcsv';

// The first step: choose a file, by clicking or by dropping it.
export const PickStep: React.FC<{onFile: (file: File) => void; error: string}> = ({onFile, error}) => {
    const input = React.useRef<HTMLInputElement>(null);
    const [over, setOver] = React.useState(false);
    return (
        <>
            {error ? (
                <Alert severity="error" sx={{marginBottom: 2}}>
                    {error}
                </Alert>
            ) : null}
            <Box
                role="button"
                tabIndex={0}
                onClick={() => input.current && input.current.click()}
                onKeyDown={(e) => e.key === 'Enter' && input.current && input.current.click()}
                onDragOver={(e) => {
                    e.preventDefault();
                    setOver(true);
                }}
                onDragLeave={() => setOver(false)}
                onDrop={(e) => {
                    e.preventDefault();
                    setOver(false);
                    const file = e.dataTransfer.files[0];
                    if (file) {
                        onFile(file);
                    }
                }}
                sx={(theme) => ({
                    border: `2px dashed ${over ? theme.palette.primary.main : theme.palette.divider}`,
                    background: over ? theme.palette.action.hover : 'transparent',
                    borderRadius: 3,
                    padding: 5,
                    textAlign: 'center',
                    cursor: 'pointer',
                    color: 'text.secondary',
                    transition: 'all .15s',
                    '&:hover': {borderColor: theme.palette.primary.main},
                })}>
                <UploadFileIcon sx={{fontSize: 44}} />
                <Typography variant="subtitle1" color="text.primary" sx={{fontWeight: 600}}>
                    把 CSV 文件拖到这里，或点击选择文件
                </Typography>
                <Typography variant="body2">用“导出 CSV”导出的文件格式，一次最多 {MAX_IMPORT_ROWS} 行</Typography>
            </Box>
            <input
                ref={input}
                type="file"
                accept=".csv,text/csv"
                hidden
                data-testid="import-file"
                onChange={(e) => {
                    const file = e.target.files && e.target.files[0];
                    e.target.value = '';
                    if (file) {
                        onFile(file);
                    }
                }}
            />
        </>
    );
};

// The last step: what was done.
export const DoneStep: React.FC<{
    imported: number;
    updated: number;
    duplicates: number;
    left: number;
    onDownloadLeft: () => void;
}> = ({imported, updated, duplicates, left, onDownloadLeft}) => (
    <Box sx={{textAlign: 'center', padding: 3}}>
        <CheckCircleIcon color="success" sx={{fontSize: 56}} />
        <Typography variant="h6" sx={{marginTop: 1}}>
            导入完成
        </Typography>
        <Typography color="text.secondary">
            新增 {imported} 条记录
            {updated > 0 ? `，更新 ${updated} 条已有记录` : ''}
            {duplicates > 0 ? `，跳过 ${duplicates} 条重复` : ''}。
        </Typography>
        {left > 0 ? (
            <Alert
                severity="warning"
                sx={{marginTop: 2, textAlign: 'left'}}
                action={<Button onClick={onDownloadLeft}>下载</Button>}>
                还有 {left} 行没有导入（有未解决的问题，或被你跳过）。可以下载这些行和原因，改好后再导入一次。
            </Alert>
        ) : null}
    </Box>
);
