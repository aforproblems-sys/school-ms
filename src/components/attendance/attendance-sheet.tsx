'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { AttendanceStatus } from '@prisma/client';
import { getAttendanceSheetAction, saveAttendanceAction } from '@/actions/attendance.actions';
import { getClassOptionsAction } from '@/actions/student.actions';
import { StatusBadge } from '@/components/shared/status-badge';
import { EmptyState } from '@/components/shared/empty-state';
import { getInitials } from '@/lib/utils';
import {
  CalendarCheck,
  CheckCircle2,
  Clock,
  UserX,
  AlertCircle,
  Save,
  Loader2,
  Radio,
  Sparkles,
  Wifi,
} from 'lucide-react';

export function AttendanceSheet() {
  const [isPending, startTransition] = useTransition();
  const [classList, setClassList] = useState<Array<{ id: string; name: string; sections: Array<{ id: string; name: string }> }>>([]);
  
  // Selection Filters
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Attendance Sheet Data
  const [sheetData, setSheetData] = useState<{
    className: string;
    sectionName: string;
    isSavedBefore: boolean;
    classAttendanceRate: number;
    students: Array<{
      studentId: string;
      fullName: string;
      admissionNo: string;
      rollNumber: string;
      studentRate: number;
      currentStatus: AttendanceStatus;
      currentRemarks?: string;
    }>;
  } | null>(null);

  const [studentStatuses, setStudentStatuses] = useState<Record<string, AttendanceStatus>>({});
  const [studentRemarks, setStudentRemarks] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [realtimeNotify, setRealtimeNotify] = useState<string | null>(null);

  // Load Class & Section options on mount
  useEffect(() => {
    getClassOptionsAction().then((res) => {
      if (res.success && res.classes && res.classes.length > 0) {
        setClassList(res.classes);
        setSelectedClassId(res.classes[0].id);
        if (res.classes[0].sections.length > 0) {
          setSelectedSectionId(res.classes[0].sections[0].id);
        }
      }
    });
  }, []);

  // Fetch Attendance Sheet when Section or Date changes
  const fetchSheet = () => {
    if (!selectedSectionId || !selectedDate) return;
    setMessage(null);
    startTransition(async () => {
      const res = await getAttendanceSheetAction({
        sectionId: selectedSectionId,
        date: selectedDate,
      });
      if (res.success && res.students) {
        setSheetData(res as any);
        const initialMap: Record<string, AttendanceStatus> = {};
        const remarksMap: Record<string, string> = {};
        res.students.forEach((s) => {
          initialMap[s.studentId] = s.currentStatus;
          if (s.currentRemarks) remarksMap[s.studentId] = s.currentRemarks;
        });
        setStudentStatuses(initialMap);
        setStudentRemarks(remarksMap);
      } else {
        setMessage({ type: 'error', text: res.error || 'Failed to load attendance sheet' });
      }
    });
  };

  useEffect(() => {
    fetchSheet();
  }, [selectedSectionId, selectedDate]);

  // Real-time SSE Connection for multi-user live updates
  useEffect(() => {
    if (!selectedSectionId) return;

    const eventSource = new EventSource(`/api/realtime?channel=${selectedSectionId}`);
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.date === selectedDate) {
          setRealtimeNotify(`Live Update: Attendance refreshed by ${data.updatedBy}`);
          fetchSheet();
          setTimeout(() => setRealtimeNotify(null), 5000);
        }
      } catch (err) {
        // SSE Ping
      }
    };

    return () => {
      eventSource.close();
    };
  }, [selectedSectionId, selectedDate]);

  // Bulk Mark All Present (1-Click Action)
  const handleBulkMarkPresent = () => {
    if (!sheetData) return;
    const updatedMap: Record<string, AttendanceStatus> = {};
    sheetData.students.forEach((s) => {
      updatedMap[s.studentId] = AttendanceStatus.PRESENT;
    });
    setStudentStatuses(updatedMap);
  };

  // Change individual status
  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setStudentStatuses((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  };

  // Save Attendance Sheet
  const handleSave = () => {
    if (!sheetData || !selectedSectionId || !selectedDate) return;
    setMessage(null);

    const records = sheetData.students.map((s) => ({
      studentId: s.studentId,
      status: studentStatuses[s.studentId] || AttendanceStatus.PRESENT,
      remarks: studentRemarks[s.studentId] || undefined,
    }));

    startTransition(async () => {
      const res = await saveAttendanceAction({
        sectionId: selectedSectionId,
        date: selectedDate,
        records,
      });

      if (res.success) {
        setMessage({ type: 'success', text: 'Attendance saved successfully & real-time update broadcasted!' });
        fetchSheet();
      } else {
        setMessage({ type: 'error', text: res.error || 'Failed to save attendance' });
      }
    });
  };

  const availableSections = classList.find((c) => c.id === selectedClassId)?.sections || [];

  // Summary counts
  const presentCount = Object.values(studentStatuses).filter(
    (st) => st === AttendanceStatus.PRESENT || st === AttendanceStatus.LATE
  ).length;
  const absentCount = Object.values(studentStatuses).filter((st) => st === AttendanceStatus.ABSENT).length;
  const leaveCount = Object.values(studentStatuses).filter((st) => st === AttendanceStatus.EXCUSED).length;
  const totalCount = sheetData?.students.length || 0;
  const currentRate = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 100;

  return (
    <div className="space-y-6">
      {/* Real-time SSE Banner */}
      {realtimeNotify && (
        <div className="p-3 rounded-xl bg-indigo-950/80 border border-indigo-700 text-indigo-200 text-xs flex items-center justify-between animate-in fade-in-50">
          <div className="flex items-center gap-2">
            <Wifi className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span>{realtimeNotify}</span>
          </div>
          <span className="text-[10px] text-indigo-300">Synced live via WebSockets/SSE</span>
        </div>
      )}

      {/* Filter Selection Panel */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full md:w-auto flex-1">
          {/* Date Picker */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            />
          </div>

          {/* Class Select */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Class Grade</label>
            <select
              value={selectedClassId}
              onChange={(e) => {
                setSelectedClassId(e.target.value);
                const matched = classList.find((c) => c.id === e.target.value);
                if (matched && matched.sections.length > 0) {
                  setSelectedSectionId(matched.sections[0].id);
                }
              }}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            >
              {classList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Section Select */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Section Stream</label>
            <select
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            >
              {availableSections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={handleBulkMarkPresent}
            className="px-3.5 py-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Mark All Present</span>
          </button>
        </div>
      </div>

      {/* Notification Alert */}
      {message && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 ${
            message.type === 'success'
              ? 'bg-emerald-950/50 border-emerald-800 text-emerald-300'
              : 'bg-rose-950/50 border-rose-800 text-rose-300'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Roster & Attendance Sheet Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        {/* Header Summary Stats */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Attendance Roster: {sheetData?.className} - {sheetData?.sectionName}</span>
              {sheetData?.isSavedBefore && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800">
                  Previously Saved
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Select status per student or bulk-mark present then click save.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[10px] text-slate-400 uppercase font-semibold">Section Rate</p>
              <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">{currentRate}%</p>
            </div>
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-800" />
            <div className="text-xs text-slate-500 space-y-0.5 font-medium">
              <p className="text-emerald-600">{presentCount} Present</p>
              <p className="text-rose-500">{absentCount} Absent</p>
            </div>
          </div>
        </div>

        {/* Student Sheet Table */}
        {isPending ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            <p className="text-xs">Loading class roster from PostgreSQL...</p>
          </div>
        ) : !sheetData || sheetData.students.length === 0 ? (
          <EmptyState
            icon={CalendarCheck}
            title="No Students in Section"
            description="There are no enrolled students in this section."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-slate-100 dark:border-slate-800 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="pb-3">Roll No</th>
                  <th className="pb-3">Student Name</th>
                  <th className="pb-3 text-center">Attendance Status</th>
                  <th className="pb-3 text-right">Overall Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                {sheetData.students.map((s) => {
                  const currentStatus = studentStatuses[s.studentId] || AttendanceStatus.PRESENT;

                  return (
                    <tr key={s.studentId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 font-mono text-[11px] font-semibold text-slate-900 dark:text-white">
                        {s.rollNumber}
                      </td>

                      <td className="py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                            {getInitials(s.fullName)}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white">{s.fullName}</p>
                            <p className="text-[10px] text-slate-400">{s.admissionNo}</p>
                          </div>
                        </div>
                      </td>

                      {/* Status Selection Buttons */}
                      <td className="py-3 text-center">
                        <div className="inline-flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80">
                          {/* Present */}
                          <button
                            type="button"
                            onClick={() => handleStatusChange(s.studentId, AttendanceStatus.PRESENT)}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                              currentStatus === AttendanceStatus.PRESENT
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                          >
                            Present
                          </button>

                          {/* Absent */}
                          <button
                            type="button"
                            onClick={() => handleStatusChange(s.studentId, AttendanceStatus.ABSENT)}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                              currentStatus === AttendanceStatus.ABSENT
                                ? 'bg-rose-600 text-white shadow-sm'
                                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                          >
                            Absent
                          </button>

                          {/* Late */}
                          <button
                            type="button"
                            onClick={() => handleStatusChange(s.studentId, AttendanceStatus.LATE)}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                              currentStatus === AttendanceStatus.LATE
                                ? 'bg-amber-500 text-white shadow-sm'
                                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                          >
                            Late
                          </button>

                          {/* Leave (Excused) */}
                          <button
                            type="button"
                            onClick={() => handleStatusChange(s.studentId, AttendanceStatus.EXCUSED)}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                              currentStatus === AttendanceStatus.EXCUSED
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                          >
                            Leave
                          </button>
                        </div>
                      </td>

                      <td className="py-3 text-right">
                        <span className="font-bold text-xs text-indigo-600 dark:text-indigo-400">
                          {s.studentRate}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Save Trigger */}
        {sheetData && sheetData.students.length > 0 && (
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">
              Ready to submit {sheetData.students.length} attendance records
            </span>
            <button
              onClick={handleSave}
              disabled={isPending}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-indigo-600/30 transition-all disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Attendance...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Attendance & Broadcast</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
