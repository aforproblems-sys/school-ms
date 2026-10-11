import React from 'react';
import Link from 'next/link';
import { getStudentByIdAction } from '@/actions/student.actions';
import { StatusBadge } from '@/components/shared/status-badge';
import { formatCurrency, formatDate, getInitials } from '@/lib/utils';
import {
  ArrowLeft,
  GraduationCap,
  CalendarCheck,
  Receipt,
  FileSpreadsheet,
  User,
  Shield,
  Phone,
  Mail,
  MapPin,
  Heart,
  CheckCircle2,
} from 'lucide-react';

export default async function StudentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const res = await getStudentByIdAction(id);

  if (!res.success || !res.student) {
    return (
      <div className="p-8 text-center space-y-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Student Not Found</h2>
        <p className="text-xs text-slate-500">The requested student profile could not be retrieved from PostgreSQL.</p>
        <Link
          href="/dashboard/users/students"
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Student Directory</span>
        </Link>
      </div>
    );
  }

  const student = res.student;
  const summary = res.summary || {
    attendanceRate: 100,
    totalAttendance: 0,
    presentCount: 0,
    totalInvoiced: 0,
    totalPaid: 0,
    pendingBalance: 0,
  };
  const user = student.user;
  const enrollment = student.enrollments[0];
  const guardian = student.parents[0]?.parent?.user;
  const relationship = student.parents[0]?.relationship || 'Guardian';

  return (
    <div className="space-y-6 pb-12">
      {/* Back Link */}
      <div>
        <Link
          href="/dashboard/users/students"
          className="inline-flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Students List</span>
        </Link>
      </div>

      {/* Main Profile Header Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white font-bold text-xl flex items-center justify-center shadow-lg shadow-indigo-600/30 shrink-0">
            {getInitials(user.fullName)}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">{user.fullName}</h1>
              <StatusBadge status={user.isActive ? 'ACTIVE' : 'INACTIVE'} />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Admission No: <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{student.admissionNo}</span> • Roll No: <span className="font-mono">{student.rollNumber || 'N/A'}</span>
            </p>
            <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
              {enrollment ? `${enrollment.class.name} - ${enrollment.section.name}` : 'Unassigned Stream'} ({enrollment?.session.name || '2025-2026 Academic Session'})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0 border-slate-100 dark:border-slate-800">
          <div className="px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-center">
            <p className="text-[10px] text-slate-400 font-semibold uppercase">Attendance Rate</p>
            <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">{summary.attendanceRate}%</p>
          </div>
          <div className="px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-center">
            <p className="text-[10px] text-slate-400 font-semibold uppercase">Pending Fee</p>
            <p className="text-lg font-extrabold text-amber-600 dark:text-amber-400">{formatCurrency(summary.pendingBalance)}</p>
          </div>
        </div>
      </div>

      {/* Grid Layout for Profile Tabs & Summaries */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Personal & Guardian Information */}
        <div className="space-y-6 lg:col-span-1">
          {/* Personal Info Box */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <User className="w-4 h-4 text-indigo-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Personal Information</h3>
            </div>

            <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Date of Birth</span>
                <span className="font-semibold">{formatDate(student.dateOfBirth)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Gender</span>
                <span className="font-semibold">{student.gender}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Blood Group</span>
                <span className="font-semibold">{student.bloodGroup || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Email</span>
                <span className="font-semibold text-slate-900 dark:text-white">{user.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Phone</span>
                <span className="font-semibold">{user.phoneNumber || 'N/A'}</span>
              </div>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 block mb-1">Residential Address</span>
                <p className="font-medium text-slate-800 dark:text-slate-200">{student.address}</p>
              </div>
            </div>
          </div>

          {/* Guardian Info Box */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Shield className="w-4 h-4 text-indigo-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Guardian & Emergency Contact</h3>
            </div>

            {guardian ? (
              <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Guardian Name</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{guardian.fullName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Relationship</span>
                  <span className="font-semibold">{relationship}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Emergency Phone</span>
                  <span className="font-semibold font-mono text-indigo-600 dark:text-indigo-400">
                    {guardian.phoneNumber || 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Guardian Email</span>
                  <span className="font-semibold">{guardian.email}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400">No guardian record attached.</p>
            )}
          </div>
        </div>

        {/* Right Column: Attendance, Fee & Exam Summary Tabs */}
        <div className="space-y-6 lg:col-span-2">
          {/* Attendance Summary */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-emerald-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Attendance Summary</h3>
              </div>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                {summary.presentCount} of {summary.totalAttendance} Days Present
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-center">
                <p className="text-[10px] text-slate-400 font-semibold uppercase">Total Recorded</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">{summary.totalAttendance}</p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-center">
                <p className="text-[10px] text-emerald-600 font-semibold uppercase">Present / Late</p>
                <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{summary.presentCount}</p>
              </div>
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-center">
                <p className="text-[10px] text-rose-600 font-semibold uppercase">Absent</p>
                <p className="text-lg font-bold text-rose-700 dark:text-rose-300">
                  {summary.totalAttendance - summary.presentCount}
                </p>
              </div>
            </div>
          </div>

          {/* Fee Invoice Ledger */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Fee Invoices & Payments</h3>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                Total Invoiced: {formatCurrency(summary.totalInvoiced)}
              </span>
            </div>

            {student.studentFees.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">No fee invoices assigned yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-100 dark:border-slate-800 font-semibold">
                      <th className="pb-2">Invoice No</th>
                      <th className="pb-2">Fee Category</th>
                      <th className="pb-2">Total</th>
                      <th className="pb-2">Paid</th>
                      <th className="pb-2 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                    {student.studentFees.map((f: any) => (
                      <tr key={f.id}>
                        <td className="py-2.5 font-mono font-semibold text-slate-900 dark:text-white">{f.invoiceNo}</td>
                        <td className="py-2.5">{f.feeStructure.name}</td>
                        <td className="py-2.5 font-bold">{formatCurrency(f.amount)}</td>
                        <td className="py-2.5 text-emerald-600 font-semibold">{formatCurrency(f.paidAmount)}</td>
                        <td className="py-2.5 text-right">
                          <StatusBadge status={f.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Exam Results Card */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <FileSpreadsheet className="w-4 h-4 text-indigo-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Academic Exam Results</h3>
            </div>

            {student.examResults.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">No examination marks published yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-100 dark:border-slate-800 font-semibold">
                      <th className="pb-2">Exam Event</th>
                      <th className="pb-2">Subject</th>
                      <th className="pb-2">Marks</th>
                      <th className="pb-2 text-right">Grade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                    {student.examResults.map((r: any) => (
                      <tr key={r.id}>
                        <td className="py-2.5 font-semibold text-slate-900 dark:text-white">
                          {r.examSubject.exam.name}
                        </td>
                        <td className="py-2.5">{r.examSubject.subject.name}</td>
                        <td className="py-2.5 font-bold">{r.marksObtained} / {r.examSubject.maxMarks}</td>
                        <td className="py-2.5 text-right font-bold text-indigo-600 dark:text-indigo-400">
                          {r.grade || 'A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
