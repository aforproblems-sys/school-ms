import React from 'react';
import Link from 'next/link';
import { Lock, ArrowLeft } from 'lucide-react';
import { getSession } from '@/lib/auth';
import { getDefaultDashboard } from '@/lib/rbac';

export default async function ForbiddenPage() {
  const session = await getSession();
  const backUrl = session ? getDefaultDashboard(session.role) : '/login';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-950 text-white font-sans">
      <div className="w-full max-w-md p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-6 shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto shadow-inner">
          <Lock className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-full bg-rose-950/60 border border-rose-800 text-rose-300">
            HTTP 403 • Access Denied
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-white pt-2">Restricted Module Access</h1>
          <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
            Your current account role <span className="text-slate-200 font-semibold">({session?.role || 'Guest'})</span> does not hold the required permissions to perform this operation or view this resource.
          </p>
        </div>

        <div className="pt-2">
          <Link
            href={backUrl}
            className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Authorized Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
