import React from 'react';
import { getSession } from '@/lib/auth';
import { GraduationCap, CalendarCheck, Clock, BookMarked, Award } from 'lucide-react';
import { StatusBadge } from '@/components/shared/status-badge';

export default async function StudentDashboard() {
  const session = await getSession();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Student Learning Dashboard
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Welcome, <span className="font-semibold text-slate-800 dark:text-slate-200">{session?.fullName}</span> • Class: <span className="font-semibold text-indigo-600 dark:text-indigo-400">Grade 10 - Section A</span> • Roll No: <span className="font-mono">10-A-01</span>
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">My Attendance</span>
            <CalendarCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">98.2%</p>
          <StatusBadge status="PRESENT" />
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Overall Academic Rank</span>
            <Award className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">Rank 3 / 35</p>
          <span className="text-[11px] text-amber-600 font-medium">Top 10% Honor List</span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Active Assignments</span>
            <BookMarked className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">2 Homeworks</p>
          <span className="text-[11px] text-slate-400 font-medium">1 Graded • 1 Pending</span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Next Exam Event</span>
            <GraduationCap className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-lg font-bold text-slate-900 dark:text-white">Mid-Term 2025</p>
          <span className="text-[11px] text-indigo-600 font-medium font-mono">Oct 24, 2025</span>
        </div>
      </div>

      {/* Class Schedule Overview */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-500" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Today's Class Schedule</h3>
          </div>
          <span className="text-[11px] text-slate-400">Monday Period Slots</span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 font-bold text-xs flex items-center justify-center">
              P1
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">Advanced Mathematics</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Teacher: Dr. Sarah Jenkins • Room 204</p>
            </div>
          </div>
          <span className="text-xs font-mono font-medium text-slate-600 dark:text-slate-400">08:00 - 08:45 AM</span>
        </div>
      </div>
    </div>
  );
}
