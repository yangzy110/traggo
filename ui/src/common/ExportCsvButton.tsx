import * as React from 'react';
import Button from '@mui/material/Button';
import DownloadIcon from '@mui/icons-material/Download';

// The same button is used on every page which exports a csv file.
export const ExportCsvButton: React.FC<{onClick: () => void; disabled?: boolean}> = ({onClick, disabled}) => (
    <Button variant="outlined" startIcon={<DownloadIcon />} onClick={onClick} disabled={disabled}>
        导出 CSV
    </Button>
);
