import * as React from 'react';
import moment from 'moment';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import {CSV_HEADER} from './teamutils';
import {downloadCsv} from '../utils/csv';
import {MAX_IMPORT_ROWS} from './importcsv';

export const downloadTemplate = () =>
    downloadCsv('traggo-import-template.csv', [
        CSV_HEADER,
        ['2026-10-16', '2026-10-16 08:00:00', '2026-10-16 09:00:00', '1', '姓名', 'Morning meeting', '标签名'],
    ]);

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
            <Box sx={{marginTop: 2, color: 'text.secondary'}}>
                <Typography variant="body2">
                    需要的列：<b>STARTING TIME</b>、<b>ENDING TIME</b>（必填），<b>CONTENT</b>（工作内容）、<b>CATEGORY</b>
                    （标签，多个用英文分号 ; 分开）。 DATE、MEMBER 会被忽略，记录都算在你自己名下；DURATION(hour) 只用来核对时间。
                </Typography>
                <Typography variant="body2" sx={{marginTop: 0.5}}>
                    时间按你当前浏览器的时区（UTC{moment().format('Z')}
                    ）读取。导入前会先检查，重复的记录会被跳过，不会改动已有数据。
                </Typography>
                <Button size="small" startIcon={<DownloadIcon />} onClick={downloadTemplate} sx={{marginTop: 1}}>
                    下载模板
                </Button>
            </Box>
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
