'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, FileText } from 'lucide-react';

interface ReportDataTableProps {
  reportTitle: string;
  rows: Record<string, unknown>[];
  total: number;
  page: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  isLoading?: boolean;
}

export function ReportDataTable({
  reportTitle,
  rows,
  total,
  page,
  totalPages,
  onPageChange,
  isLoading = false,
}: ReportDataTableProps) {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-12 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent mb-3" />
        <p className="text-xs font-medium text-gray-500">Querying PostgreSQL database for live analytics...</p>
      </div>
    );
  }

  if (!rows || rows.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-12 text-center">
        <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">No Data Matching Filter Parameters</h4>
        <p className="text-xs text-gray-500 mt-1">Try adjusting your date range, class, or search filter parameters.</p>
      </div>
    );
  }

  const columns = Object.keys(rows[0]).filter((col) => col !== 'id');

  const formatHeader = (key: string) => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  };

  return (
    <div className="print-container bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-xs">
      {/* Formal Letterhead Header for Print Mode */}
      <div className="print-only p-6 border-b border-gray-300 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">ACADEMIC & MANAGEMENT SYSTEM</h1>
            <p className="text-xs text-gray-600">Official Administrative & Operations Report</p>
          </div>
          <div className="text-right text-xs text-gray-500">
            <p className="font-semibold text-gray-800">{reportTitle}</p>
            <p>Generated: {new Date().toLocaleDateString('en-US', { dateStyle: 'medium' })}</p>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-50 dark:bg-gray-800/60 text-gray-700 dark:text-gray-300 font-semibold border-b border-gray-200 dark:border-gray-800">
            <tr>
              {columns.map((col) => (
                <th key={col} className="px-4 py-3.5 whitespace-nowrap">
                  {formatHeader(col)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-700 dark:text-gray-300">
            {rows.map((row, rIdx) => (
              <tr
                key={typeof row.id === 'string' || typeof row.id === 'number' ? row.id : rIdx}
                className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors"
              >
                {columns.map((col) => {
                  const val = row[col];
                  let badgeColor = '';
                  if (val === 'ACTIVE' || val === 'PRESENT' || val === 'PAID' || val === 'PASS' || val === 'Active') {
                    badgeColor = 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-200';
                  } else if (val === 'ABSENT' || val === 'UNPAID' || val === 'FAIL' || val === 'Inactive') {
                    badgeColor = 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border-rose-200';
                  } else if (val === 'LATE' || val === 'PARTIALLY_PAID' || val === 'EXCUSED') {
                    badgeColor = 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-200';
                  }

                  return (
                    <td key={col} className="px-4 py-3 whitespace-nowrap">
                      {badgeColor ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badgeColor}`}>
                          {String(val)}
                        </span>
                      ) : (
                        <span>{String(val ?? '-')}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="pagination-controls px-4 py-3 bg-gray-50 dark:bg-gray-800/40 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between no-print">
        <p className="text-xs text-gray-500">
          Showing <span className="font-semibold text-gray-900 dark:text-gray-100">{rows.length}</span> of{' '}
          <span className="font-semibold text-gray-900 dark:text-gray-100">{total}</span> records
        </p>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 disabled:opacity-40 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          </button>

          <span className="text-xs text-gray-700 dark:text-gray-300 font-medium px-2">
            Page {page} of {totalPages || 1}
          </span>

          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 disabled:opacity-40 cursor-pointer"
          >
            <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
      </div>
    </div>
  );
}
