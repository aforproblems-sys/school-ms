'use client';

import React from 'react';
import { Printer, Download, FileSpreadsheet } from 'lucide-react';
import { triggerPrint, exportToCSV, exportToExcel } from '@/lib/export-utils';

interface ReportExportButtonsProps {
  reportTitle: string;
  rows: Record<string, unknown>[];
}

export function ReportExportButtons({ reportTitle, rows }: ReportExportButtonsProps) {
  const sanitizeFilename = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '_');

  return (
    <div className="export-buttons flex items-center gap-2 no-print">
      <button
        onClick={triggerPrint}
        className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl text-xs font-medium transition-colors cursor-pointer"
        title="Print Formal Report"
      >
        <Printer className="w-3.5 h-3.5" />
        <span>Print</span>
      </button>

      <button
        onClick={() => exportToCSV(sanitizeFilename(reportTitle), rows)}
        className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl text-xs font-medium transition-colors cursor-pointer"
        title="Download CSV Format"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Export CSV</span>
      </button>

      <button
        onClick={() => exportToExcel(sanitizeFilename(reportTitle), rows)}
        className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-medium transition-colors shadow-xs cursor-pointer"
        title="Download Excel-Compatible Spreadsheet"
      >
        <FileSpreadsheet className="w-3.5 h-3.5" />
        <span>Export Excel</span>
      </button>
    </div>
  );
}
