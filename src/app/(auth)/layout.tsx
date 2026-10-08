import React from 'react';
import { ShieldCheck, GraduationCap, Lock, Award } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Left Branding & Highlights Panel */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 border-r border-slate-800/80 relative overflow-hidden">
        {/* Background ambient lighting */}
        <div className="absolute top-0 -left-20 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 -right-20 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Top Brand Info */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-indigo-500/30">
            SMS
          </div>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight text-white">EduManage Pro</h1>
            <p className="text-xs text-indigo-300/80 font-medium">Enterprise School Management</p>
          </div>
        </div>

        {/* Middle Value Proposition */}
        <div className="relative z-10 my-auto py-12 max-w-lg space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold">
            <Award className="w-3.5 h-3.5 text-indigo-400" />
            <span>Production-Grade Architecture</span>
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight leading-tight">
            Streamlining Education, Finance & Operations in One Platform.
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Role-tailored access control for Super Admins, School Leaders, Teachers, Accountants, Parents, and Students with real-time insights and complete data protection.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-semibold text-slate-200">ACID Financial Safety</h4>
                <p className="text-[11px] text-slate-400">Transaction-safe payments & payroll</p>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start gap-3">
              <GraduationCap className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-semibold text-slate-200">Real-time Portal</h4>
                <p className="text-[11px] text-slate-400">Live notices, marks & attendance</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Security Note */}
        <div className="relative z-10 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-800/60 pt-6">
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-emerald-500" />
            <span>256-bit Encrypted Session</span>
          </div>
          <span>© 2026 EduManage Inc.</span>
        </div>
      </div>

      {/* Right Auth Content Container */}
      <div className="flex flex-col justify-center items-center p-6 sm:p-12 bg-slate-950">
        <div className="w-full max-w-md space-y-8">
          {children}
        </div>
      </div>
    </div>
  );
}
