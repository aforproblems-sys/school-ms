import React from 'react';
import { getSession } from '@/lib/auth';
import { GraduationCap, CalendarCheck, Clock, BookMarked, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default async function TeacherDashboard() {
  const session = await getSession();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Teacher Portal
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Welcome, <span className="font-semibold text-slate-800 dark:text-slate-200">{session?.fullName}</span> • Assigned to Grade 10 - Section A (Advanced Mathematics)
        </p>
      </div>

      {/* Quick Action Shortcuts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/dashboard/attendance/student"
          className="p-5 rounded-2xl bg-indigo-600 text-white shadow-md hover:bg-indigo-500 transition-all flex items-center justify-between"
        >
          <div className="space-y-1">
            <span className="text-xs font-semibold text-indigo-100 uppercase tracking-wider">Daily Class</span>
            <p className="text-lg font-bold">Mark Attendance</p>
          </div>
          <CalendarCheck className="w-8 h-8 text-indigo-200" />
        </Link>

        <Link
          href="/dashboard/examinations/marks"
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-indigo-500 transition-all flex items-center justify-between"
        >
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Assessments</span>
            <p className="text-lg font-bold text-slate-900 dark:text-white">Enter Exam Marks</p>
          </div>
          <GraduationCap className="w-8 h-8 text-indigo-500" />
        </Link>

        <Link
          href="/dashboard/academic-work/homework"
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-indigo-500 transition-all flex items-center justify-between"
        >
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Assignments</span>
            <p className="text-lg font-bold text-slate-900 dark:text-white">Assign Homework</p>
          </div>
          <BookMarked className="w-8 h-8 text-blue-500" />
        </Link>
      </div>

      {/* Class Schedule Overview */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-500" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Today's Teaching Schedule</h3>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">Monday Periods</span>
        </div>

        <div className="space-y-3">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-xs flex items-center justify-center">
                P1
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">Grade 10 - Section A</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Advanced Mathematics • Room 204</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-medium text-slate-600 dark:text-slate-400">08:00 - 08:45 AM</span>
              <CheckCircle className="w-4 h-4 text-emerald-500" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
