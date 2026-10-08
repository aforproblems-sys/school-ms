'use client';

import React from 'react';
import { AlertOctagon, RefreshCw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-950 text-white font-sans antialiased">
        <div className="w-full max-w-md p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto shadow-inner">
            <AlertOctagon className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-full bg-rose-950/60 border border-rose-800 text-rose-300">
              Critical Runtime Exception
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-white pt-2">System Initializing Error</h1>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
              A critical failure occurred during application shell loading. Please retry or contact system administration.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={() => reset()}
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl border border-rose-500 transition-all shadow-lg shadow-rose-600/20"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reload System Shell</span>
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
