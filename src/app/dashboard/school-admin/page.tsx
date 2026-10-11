import React from 'react';
import { getSession } from '@/lib/auth';
import { getDashboardStatsAction } from '@/actions/dashboard.actions';
import { StatCard } from '@/components/dashboard/stat-card';
import { EnrollmentChart } from '@/components/charts/enrollment-chart';
import { AttendanceTrendChart } from '@/components/charts/attendance-trend-chart';
import { FeeCollectionChart } from '@/components/charts/fee-collection-chart';
import { ExpenseChart } from '@/components/charts/expense-chart';
import { StatusBadge } from '@/components/shared/status-badge';
import { EmptyState } from '@/components/shared/empty-state';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  GraduationCap,
  Users,
  Building2,
  CalendarCheck,
  Receipt,
  DollarSign,
  Wallet,
  Plus,
  Bell,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

export default async function SchoolAdminDashboard() {
  const session = await getSession();
  const res = await getDashboardStatsAction();

  if (!res.success || !res.data) {
    throw new Error(res.error || 'Failed to query PostgreSQL database stats');
  }

  const stats = res.data;

  return (
    <div className="space-y-8 pb-10">
      {/* Top Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            School Management Overview
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Grandview International Academy • Logged in as{' '}
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {session?.fullName}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/users/students"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Student</span>
          </Link>
        </div>
      </div>

      {/* 7 Required Dashboard Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Students */}
        <StatCard
          title="Total Students"
          value={stats.totalStudents}
          subtext="Enrolled across all grades"
          icon={GraduationCap}
          iconColor="text-indigo-500"
          trend={{ value: '+5.2%', isPositive: true }}
        />

        {/* Card 2: Total Teachers */}
        <StatCard
          title="Total Teachers"
          value={stats.totalTeachers}
          subtext="Active academic faculty"
          icon={Users}
          iconColor="text-blue-500"
        />

        {/* Card 3: Total Classes */}
        <StatCard
          title="Total Classes"
          value={stats.totalClasses}
          subtext="Grade levels configured"
          icon={Building2}
          iconColor="text-purple-500"
        />

        {/* Card 4: Today's Attendance */}
        <StatCard
          title="Today's Attendance"
          value={`${stats.todayAttendanceRate}%`}
          subtext={`${stats.todayPresentCount} of ${stats.todayTotalCount || stats.totalStudents} present`}
          icon={CalendarCheck}
          iconColor="text-emerald-500"
          trend={{ value: '+1.4%', isPositive: true }}
        />

        {/* Card 5: Pending Fees */}
        <StatCard
          title="Pending Fees"
          value={formatCurrency(stats.pendingFees)}
          subtext="Uncollected invoice balance"
          icon={Receipt}
          iconColor="text-amber-500"
        />

        {/* Card 6: Monthly Revenue */}
        <StatCard
          title="Monthly Revenue"
          value={formatCurrency(stats.monthlyRevenue)}
          subtext="Fee payments received"
          icon={DollarSign}
          iconColor="text-emerald-600"
          trend={{ value: '+12%', isPositive: true }}
        />

        {/* Card 7: Monthly Expenses */}
        <StatCard
          title="Monthly Expenses"
          value={formatCurrency(stats.monthlyExpenses)}
          subtext="Operations & payroll"
          icon={Wallet}
          iconColor="text-rose-500"
        />
      </div>

      {/* 4 Required Recharts Data Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Enrollment Distribution */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Student Enrollment Distribution
              </h3>
              <p className="text-[11px] text-slate-400">Class level breakdown</p>
            </div>
            <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              Live DB Query
            </span>
          </div>
          {stats.enrollmentByClass.length === 0 ? (
            <EmptyState title="No Class Data" description="No classes recorded in PostgreSQL yet." />
          ) : (
            <EnrollmentChart data={stats.enrollmentByClass} />
          )}
        </div>

        {/* Chart 2: Attendance Trends */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Attendance Rate Trends
              </h3>
              <p className="text-[11px] text-slate-400">Daily student present rate %</p>
            </div>
            <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              Weekly Overview
            </span>
          </div>
          <AttendanceTrendChart data={stats.attendanceTrends} />
        </div>

        {/* Chart 3: Fee Collections */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Fee Collection vs Pending Balance
              </h3>
              <p className="text-[11px] text-slate-400">Monthly breakdown</p>
            </div>
          </div>
          <FeeCollectionChart data={stats.feeCollectionTrends} />
        </div>

        {/* Chart 4: Expenses Breakdown */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Monthly Expenses Breakdown
              </h3>
              <p className="text-[11px] text-slate-400">Category disbursements</p>
            </div>
          </div>
          <ExpenseChart data={stats.expenseBreakdown} />
        </div>
      </div>

      {/* 4 Required Recent Activity Sections Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 1: Recent Students Table */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent Students</h3>
            <Link
              href="/dashboard/users/students"
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {stats.recentStudents.length === 0 ? (
            <EmptyState title="No Recent Students" description="No student admissions logged yet." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-100 dark:border-slate-800 font-semibold">
                    <th className="pb-2">Student Name</th>
                    <th className="pb-2">Admission No</th>
                    <th className="pb-2">Class / Sec</th>
                    <th className="pb-2 text-right">Admitted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                  {stats.recentStudents.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-2.5 font-semibold text-slate-900 dark:text-white">
                        {s.fullName}
                      </td>
                      <td className="py-2.5 font-mono text-[11px]">{s.admissionNo}</td>
                      <td className="py-2.5">{s.className} - {s.sectionName}</td>
                      <td className="py-2.5 text-right text-slate-400">{formatDate(s.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Section 2: Recent Payments Table */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent Fee Payments</h3>
            <Link
              href="/dashboard/finance/fees"
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {stats.recentPayments.length === 0 ? (
            <EmptyState title="No Payments Recorded" description="No fee transactions logged in DB." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-100 dark:border-slate-800 font-semibold">
                    <th className="pb-2">Transaction Ref</th>
                    <th className="pb-2">Student</th>
                    <th className="pb-2">Amount</th>
                    <th className="pb-2 text-right">Method</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                  {stats.recentPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-2.5 font-mono text-[11px] font-semibold text-slate-900 dark:text-white">
                        {p.transactionRef}
                      </td>
                      <td className="py-2.5">{p.studentName}</td>
                      <td className="py-2.5 font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(p.amount)}
                      </td>
                      <td className="py-2.5 text-right">
                        <StatusBadge status={p.paymentMethod} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Section 3: Recent Notices List */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-indigo-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent Notices</h3>
            </div>
            <Link
              href="/dashboard/communication/notices"
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Notice Board
            </Link>
          </div>

          {stats.recentNotices.length === 0 ? (
            <EmptyState title="No Active Notices" description="No broadcast announcements present." />
          ) : (
            <div className="space-y-3">
              {stats.recentNotices.map((n) => (
                <div
                  key={n.id}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-slate-900 dark:text-white">
                      {n.title}
                    </h4>
                    <span className="text-[10px] text-slate-400">{formatDate(n.createdAt)}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                    {n.content}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                    <span>By: {n.authorName}</span>
                    <span className="font-semibold text-indigo-500">
                      Target: {n.targetRole || 'All Roles'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 4: Today's Attendance Summary */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-emerald-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Today's Attendance Breakdown
              </h3>
            </div>
            <StatusBadge status={stats.todayAttendanceRate >= 90 ? 'PRESENT' : 'LATE'} />
          </div>

          <div className="space-y-4 py-2">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1.5">
                <span className="text-slate-700 dark:text-slate-300">Overall Attendance Progress</span>
                <span className="text-emerald-600 font-bold">{stats.todayAttendanceRate}%</span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden p-0.5">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${stats.todayAttendanceRate}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40">
                <p className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">Present / Late</p>
                <p className="text-xl font-bold text-emerald-700 dark:text-emerald-200 mt-0.5">
                  {stats.todayPresentCount}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40">
                <p className="text-[11px] font-semibold text-rose-800 dark:text-rose-300">Absent</p>
                <p className="text-xl font-bold text-rose-700 dark:text-rose-200 mt-0.5">
                  {Math.max(0, stats.todayTotalCount - stats.todayPresentCount)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
