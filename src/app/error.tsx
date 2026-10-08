'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { errorReporter } from '@/lib/error-reporter';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [errorId, setErrorId] = useState<string | null>(null);

  useEffect(() => {
    // Log error using provider-independent reporter
    const res = errorReporter.captureError(error, {
      severity: 'high',
      action: 'NEXT_APP_ERROR_BOUNDARY',
      metadata: { digest: error.digest },
    });
    setErrorId(res.errorId);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-950 text-white font-sans">
      <div className="w-full max-w-md p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-6 shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto shadow-inner">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-full bg-amber-950/60 border border-amber-800 text-amber-300">
            HTTP 500 • Application Error
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-white pt-2">Unexpected System Error</h1>
          <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
            An unexpected error occurred while processing your request. Our technical monitoring team has been notified.
          </p>
          {errorId && (
            <p className="text-[11px] font-mono text-slate-500 pt-1">
              Tracking Reference: <span className="text-slate-300 font-semibold">{errorId}</span>
            </p>
          )}
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => reset()}
            className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl border border-indigo-500 transition-all shadow-lg shadow-indigo-600/20"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Try Again</span>
          </button>
          <Link
            href="/dashboard"
            className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-all"
          >
            <Home className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
