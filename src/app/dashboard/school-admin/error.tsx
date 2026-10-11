'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard Error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 space-y-4">
      <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 flex items-center justify-center">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Unable to Load Dashboard Data</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
          {error.message || 'An unexpected database connection error occurred while querying statistics.'}
        </p>
      </div>
      <button
        onClick={() => reset()}
        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        <span>Retry Query</span>
      </button>
    </div>
  );
}
