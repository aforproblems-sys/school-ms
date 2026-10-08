/**
 * Helper function to trigger browser print dialog
 */
export function triggerPrint() {
  if (typeof window !== 'undefined') {
    window.print();
  }
}

/**
 * Converts array of objects to raw CSV string and initiates browser download
 */
export function exportToCSV(filename: string, rows: Record<string, unknown>[]) {
  if (!rows || rows.length === 0) return;

  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      headers
        .map((header) => {
          let val = row[header] ?? '';
          if (typeof val === 'object') val = JSON.stringify(val);
          val = String(val).replace(/"/g, '""');
          return `"${val}"`;
        })
        .join(',')
    ),
  ].join('\n');

  if (typeof document !== 'undefined') {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  return csvContent;
}

/**
 * Converts array of objects to Excel-compatible CSV string with UTF-8 BOM byte marker
 */
export function exportToExcel(filename: string, rows: Record<string, unknown>[]) {
  if (!rows || rows.length === 0) return;

  const headers = Object.keys(rows[0]);
  const csvRows = [
    headers.join('\t'),
    ...rows.map((row) =>
      headers
        .map((header) => {
          let val = row[header] ?? '';
          if (typeof val === 'object') val = JSON.stringify(val);
          return String(val).replace(/\t/g, ' ');
        })
        .join('\t')
    ),
  ];

  // Prepend UTF-8 BOM \uFEFF for seamless Excel encoding recognition
  const bom = '\uFEFF';
  const fullContent = bom + csvRows.join('\n');

  if (typeof document !== 'undefined') {
    const blob = new Blob([fullContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  return fullContent;
}
