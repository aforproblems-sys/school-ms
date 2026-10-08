'use client';

import React from 'react';
import { History, CheckCircle, Database } from 'lucide-react';

export interface ImportHistoryLogItem {
  id: string;
  importedBy: string;
  timestamp: string;
  details: {
    type?: string;
    name?: string;
    admissionNo?: string;
    employeeId?: string;
    invoiceNo?: string;
  };
}

interface ImportHistoryTableProps {
  logs: ImportHistoryLogItem[];
}

export function ImportHistoryTable({ logs }: ImportHistoryTableProps) {
  if (!logs || logs.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 text-center text-xs text-gray-500">
        <History className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p>No recent bulk data import logs recorded.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-xs">
      <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-3 mb-4">
        <Database className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
        <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">
          Recent Bulk Import Activity Logs
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-50 dark:bg-gray-800/60 text-gray-700 dark:text-gray-300 font-semibold border-b border-gray-200 dark:border-gray-800">
            <tr>
              <th className="px-3 py-2.5">Timestamp</th>
              <th className="px-3 py-2.5">Import Type</th>
              <th className="px-3 py-2.5">Imported By</th>
              <th className="px-3 py-2.5">Record Identifier</th>
              <th className="px-3 py-2.5 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-700 dark:text-gray-300">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40">
                <td className="px-3 py-2 font-mono text-[11px] text-gray-500">{log.timestamp}</td>
                <td className="px-3 py-2 font-semibold text-gray-800 dark:text-gray-200">
                  {log.details?.type || 'BULK_IMPORT'}
                </td>
                <td className="px-3 py-2">{log.importedBy}</td>
                <td className="px-3 py-2 font-medium text-indigo-600 dark:text-indigo-400">
                  {log.details?.name || log.details?.admissionNo || log.details?.employeeId || log.details?.invoiceNo || 'Record Created'}
                </td>
                <td className="px-3 py-2 text-center">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200">
                    <CheckCircle className="w-3 h-3" />
                    Success
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
