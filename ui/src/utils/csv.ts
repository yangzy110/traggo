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

// Parses csv text (quotes, "" as an escaped quote, line breaks inside of quotes, a BOM at the start).
export const parseCsv = (text: string): string[][] => {
    const rows: string[][] = [];
    let row: string[] = [];
    let cell = '';
    let quoted = false;
    const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
    for (let i = 0; i < input.length; i++) {
        const c = input[i];
        if (quoted) {
            if (c === '"' && input[i + 1] === '"') {
                cell += '"';
                i++;
            } else if (c === '"') {
                quoted = false;
            } else {
                cell += c;
            }
        } else if (c === '"') {
            quoted = true;
        } else if (c === ',') {
            row.push(cell);
            cell = '';
        } else if (c === '\n' || c === '\r') {
            if (c === '\r' && input[i + 1] === '\n') {
                i++;
            }
            row.push(cell);
            rows.push(row);
            row = [];
            cell = '';
        } else {
            cell += c;
        }
    }
    if (cell !== '' || row.length > 0) {
        row.push(cell);
        rows.push(row);
    }
    return rows;
};
