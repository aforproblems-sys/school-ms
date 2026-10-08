import React from 'react';
import Link from 'next/link';
import { ShieldAlert, LogIn } from 'lucide-react';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-950 text-white font-sans">
      <div className="w-full max-w-md p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-6 shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto shadow-inner">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-full bg-amber-950/60 border border-amber-800 text-amber-300">
            HTTP 401 • Authentication Required
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-white pt-2">Session Expired or Missing</h1>
          <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
            You must be signed in with valid credentials to access this system module. Please sign in to establish an active session.
          </p>
        </div>

        <div className="pt-2">
          <Link
            href="/login"
            className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition-all"
          >
            <LogIn className="w-4 h-4" />
            <span>Go to Login Page</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
