'use client';

import React from 'react';
import { AlertTriangle, AlertCircle } from 'lucide-react';
import { RowErrorItem } from '@/actions/import.actions';

interface ImportErrorAlertProps {
  errors: RowErrorItem[];
  invalidCount: number;
}

export function ImportErrorAlert({ errors, invalidCount }: ImportErrorAlertProps) {
  if (!errors || errors.length === 0) return null;

  return (
    <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl p-5 mb-6 shadow-xs">
      <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 font-bold text-sm mb-3">
        <AlertTriangle className="w-4 h-4 text-rose-600" />
        <h4>
          Row Validation Errors Found ({invalidCount} {invalidCount === 1 ? 'Row' : 'Rows'} Failed)
        </h4>
      </div>

      <p className="text-xs text-rose-700 dark:text-rose-400 mb-3">
        The following errors must be fixed in your spreadsheet before importing these specific rows into PostgreSQL:
      </p>

      <div className="max-h-60 overflow-y-auto rounded-xl border border-rose-200 dark:border-rose-900/60 bg-white dark:bg-gray-900">
        <table className="w-full text-left text-xs">
          <thead className="bg-rose-100/70 dark:bg-rose-950 text-rose-900 dark:text-rose-200 font-semibold border-b border-rose-200">
            <tr>
              <th className="px-3 py-2 text-center w-16">Row #</th>
              <th className="px-3 py-2 w-36">Field</th>
              <th className="px-3 py-2">Validation Failure Rationale</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rose-100 dark:divide-rose-950 text-gray-800 dark:text-gray-200">
            {errors.map((err, idx) => (
              <tr key={idx} className="hover:bg-rose-50/50 dark:hover:bg-rose-950/30">
                <td className="px-3 py-2 text-center font-bold text-rose-700 font-mono">Row {err.rowNumber}</td>
                <td className="px-3 py-2 font-mono text-[11px] text-gray-600 dark:text-gray-400">{err.field}</td>
                <td className="px-3 py-2 flex items-center gap-1.5 text-rose-800 dark:text-rose-300">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <span>{err.errorMessage}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
