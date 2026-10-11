'use client';

import React, { useState, useEffect } from 'react';
import { ImportWizard } from '@/components/import/ImportWizard';
import { ExportManager } from '@/components/import/ExportManager';
import { ImportHistoryTable, ImportHistoryLogItem } from '@/components/import/ImportHistoryTable';
import { getImportHistoryAction } from '@/actions/import.actions';

export default function ImportExportPage() {
  const [historyLogs, setHistoryLogs] = useState<ImportHistoryLogItem[]>([]);

  const loadHistory = () => {
    getImportHistoryAction().then((res) => {
      if (res.success && res.history) {
        setHistoryLogs(res.history);
      }
    });
  };

  useEffect(() => {
    loadHistory();
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
          Bulk Data Import & Export Hub
        </h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          CSV/XLSX bulk import wizard with row-by-row server validation, parent linking, and filtered export manager.
        </p>
      </div>

      {/* 1. Import Wizard */}
      <ImportWizard onImportFinished={loadHistory} />

      {/* 2. Export Manager */}
      <ExportManager />

      {/* 3. Import Audit History Table */}
      <ImportHistoryTable logs={historyLogs} />
    </div>
  );
}
