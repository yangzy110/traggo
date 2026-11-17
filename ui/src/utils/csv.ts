// Cells starting with these characters are interpreted as formulas by spreadsheet software.
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

export const csvCell = (value: string): string => {
    const safe = FORMULA_PREFIX.test(value) ? "'" + value : value;
    return /[",\r\n]/.test(safe) ? '"' + safe.replace(/"/g, '""') + '"' : safe;
};

// The BOM makes Excel detect UTF-8, otherwise non-ASCII characters are garbled.
export const toCsv = (rows: string[][]): string => '\uFEFF' + rows.map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n';

export const downloadCsv = (filename: string, rows: string[][]) => {
    const blob = new Blob([toCsv(rows)], {type: 'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
