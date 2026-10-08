'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { loginAction } from '@/actions/auth.actions';
import { Eye, EyeOff, Lock, Mail, ArrowRight, Loader2, AlertCircle, ShieldAlert } from 'lucide-react';

const DEMO_ACCOUNTS = [
  { role: 'Super Admin', email: 'superadmin@school.com', color: 'border-purple-500/40 text-purple-400 bg-purple-950/20' },
  { role: 'School Admin', email: 'admin@school.com', color: 'border-indigo-500/40 text-indigo-400 bg-indigo-950/20' },
  { role: 'Teacher', email: 'teacher@school.com', color: 'border-blue-500/40 text-blue-400 bg-blue-950/20' },
  { role: 'Accountant', email: 'accountant@school.com', color: 'border-emerald-500/40 text-emerald-400 bg-emerald-950/20' },
  { role: 'Parent', email: 'parent@school.com', color: 'border-amber-500/40 text-amber-400 bg-amber-950/20' },
  { role: 'Student', email: 'student@school.com', color: 'border-cyan-500/40 text-cyan-400 bg-cyan-950/20' },
];

export default function LoginPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [email, setEmail] = useState('admin@school.com');
  const [password, setPassword] = useState('Password123!');

  const fillDemoAccount = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Password123!');
    setErrorMsg(null);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);

    const formData = new FormData();
    formData.append('email', email);
    formData.append('password', password);

    startTransition(async () => {
      const res = await loginAction(null, formData);
      console.log('LOGIN RESULT:', res);
      if (!res.success) {
        setErrorMsg(res.error || 'Login failed');
      } else if (res.redirectTo) {
        router.push(res.redirectTo);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">Sign in to your portal</h2>
        <p className="mt-1 text-xs text-slate-400">
          Enter your credentials or select a demo role below to sign in.
        </p>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in-50">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Authentication Failed</p>
            <p className="mt-0.5 text-rose-300/80">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Quick Demo Switcher */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          <ShieldAlert className="w-3.5 h-3.5 text-indigo-400" />
          <span>Quick Demo Access (Click to Fill)</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {DEMO_ACCOUNTS.map((acc) => (
            <button
              key={acc.role}
              type="button"
              onClick={() => fillDemoAccount(acc.email)}
              className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-all hover:scale-[1.02] text-left truncate ${acc.color}`}
            >
              {acc.role}
            </button>
          ))}
        </div>
      </div>

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-300">Email Address</label>
          <div className="relative">
            <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@school.com"
              className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-slate-300">Password</label>
            <Link
              href="/forgot-password"
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full pl-9 pr-10 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isPending}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Authenticating...</span>
            </>
          ) : (
            <>
              <span>Sign In to Account</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
