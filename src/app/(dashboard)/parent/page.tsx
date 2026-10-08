import React from 'react';
import { getSession } from '@/lib/auth';
import { GraduationCap, CalendarCheck, Receipt, BookMarked, Bell } from 'lucide-react';
import { StatusBadge } from '@/components/shared/status-badge';

export default async function ParentDashboard() {
  const session = await getSession();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Parent Portal
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Welcome back, <span className="font-semibold text-slate-800 dark:text-slate-200">{session?.fullName}</span> • Monitoring Child: <span className="font-semibold text-indigo-600 dark:text-indigo-400">Alexander Davis (Grade 10 - Sec A)</span>
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Child Attendance</span>
            <CalendarCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">98.2%</p>
          <StatusBadge status="PRESENT" />
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Term GPA Average</span>
            <GraduationCap className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">3.85 / 4.0</p>
          <span className="text-[11px] text-emerald-600 font-medium">Grade A Performance</span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Pending Homework</span>
            <BookMarked className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">2 Assigned</p>
          <span className="text-[11px] text-slate-400 font-medium">Due in 3 days</span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Fee Invoice Balance</span>
            <Receipt className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">$1,000.00</p>
          <StatusBadge status="PARTIALLY_PAID" />
        </div>
      </div>

      {/* School Announcements */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
          <Bell className="w-4 h-4" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Important School Broadcast</h3>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Welcome to the 2025-2026 Academic Year! Mid-term progress report cards will be released directly through your parent portal dashboard.
        </p>
      </div>
    </div>
  );
}
