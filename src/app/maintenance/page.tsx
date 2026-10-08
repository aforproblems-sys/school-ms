import React from 'react';
import Link from 'next/link';
import { Wrench, ShieldCheck, RefreshCw } from 'lucide-react';
import { getMaintenanceStatus } from '@/lib/maintenance';

export default function MaintenancePage() {
  const status = getMaintenanceStatus();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-950 text-white font-sans">
      <div className="w-full max-w-md p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-6 shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto shadow-inner animate-pulse">
          <Wrench className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-full bg-amber-950/60 border border-amber-800 text-amber-300">
            System Maintenance Active
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-white pt-2">EduManage Pro Under Maintenance</h1>
          <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
            {status.message}
          </p>
          {status.enabledAt && (
            <p className="text-[11px] font-mono text-slate-500 pt-1">
              Maintenance Initiated: {new Date(status.enabledAt).toLocaleString()}
            </p>
          )}
        </div>

        <div className="pt-2 flex flex-col gap-3">
          <Link
            href="/login"
            className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-all"
          >
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>Administrator Sign In</span>
          </Link>
          <a
            href="/maintenance"
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-slate-400 hover:text-slate-200 text-xs font-medium transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Check Status Again</span>
          </a>
        </div>
      </div>
    </div>
  );
}
