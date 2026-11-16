// Cells starting with these characters are interpreted as formulas by spreadsheet software.
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

// Spreadsheets turn dates into date cells which are shown as ### if the column is too narrow. A text cell is always
// readable, so dates and times are marked to be written as text (="2026-11-16 08:00").
const TEXT_MARK = '\u0001';
export const asText = (value: string): string => TEXT_MARK + value;

export const csvCell = (value: string): string => {
    if (value.startsWith(TEXT_MARK)) {
        return '"=""' + value.slice(TEXT_MARK.length).replace(/"/g, '""""') + '"""';
    }
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
