import React from 'react';
import { Metadata } from 'next';
import { AttendanceSheet } from '@/components/attendance/attendance-sheet';
import { getAttendanceHistoryAction } from '@/actions/attendance.actions';
import { CalendarCheck, History, Users, Award, Percent } from 'lucide-react';
import { StatusBadge } from '@/components/shared/status-badge';

export const metadata: Metadata = {
  title: 'Student Attendance | EduManage Pro',
  description: 'Mark, update, and monitor student attendance in real time.',
};

export default async function StudentAttendancePage() {
  const historyRes = await getAttendanceHistoryAction({ limit: 10 });
  const historyList = historyRes.success && historyRes.history ? historyRes.history : [];

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">
            <CalendarCheck className="w-4 h-4" />
            <span>Attendance Management</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Student Attendance Roster
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
            Select date, class, and section to mark attendance. Updates are broadcasted live to all connected admin and teacher sessions without browser refreshes.
          </p>
        </div>
      </div>

      {/* Attendance Sheet Component */}
      <AttendanceSheet />

      {/* Attendance History Section */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-500" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Recent Attendance Logs</h2>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">Last 10 sessions recorded</span>
        </div>

        {historyList.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No attendance records found yet. Mark attendance above to populate logs.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-slate-100 dark:border-slate-800 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Class & Section</th>
                  <th className="pb-3 text-center">Total Students</th>
                  <th className="pb-3 text-center">Present / Late</th>
                  <th className="pb-3 text-center">Absent / Leave</th>
                  <th className="pb-3 text-right">Attendance Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                {historyList.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 font-medium text-slate-900 dark:text-white">
                      {new Date(log.date).toLocaleDateString(undefined, {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="py-3">
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {log.className}
                      </span>
                      <span className="text-slate-400 ml-1 font-normal">({log.sectionName})</span>
                    </td>
                    <td className="py-3 text-center font-mono font-medium">{log.total}</td>
                    <td className="py-3 text-center font-semibold text-emerald-600 dark:text-emerald-400">
                      {log.present}
                    </td>
                    <td className="py-3 text-center font-semibold text-rose-500">
                      {log.absent}
                    </td>
                    <td className="py-3 text-right">
                      <span
                        className={`inline-flex items-center gap-1 font-bold px-2.5 py-0.5 rounded-full text-xs ${
                          log.rate >= 80
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : log.rate >= 60
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                        }`}
                      >
                        {log.rate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
