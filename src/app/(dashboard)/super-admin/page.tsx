import React from 'react';
import { getSession } from '@/lib/auth';
import { getDashboardStatsAction } from '@/actions/dashboard.actions';
import { StatCard } from '@/components/dashboard/stat-card';
import { EnrollmentChart } from '@/components/charts/enrollment-chart';
import { FeeCollectionChart } from '@/components/charts/fee-collection-chart';
import { Building2, Shield, Users, Database, Activity, ArrowRight } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';

export default async function SuperAdminDashboard() {
  const session = await getSession();
  const res = await getDashboardStatsAction();

  if (!res.success || !res.data) {
    throw new Error(res.error || 'Failed to query PostgreSQL system metrics');
  }

  const stats = res.data;

  return (
    <div className="space-y-8 pb-10">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            System Control Center
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Global administrator panel • Logged in as{' '}
            <span className="font-semibold text-indigo-600 dark:text-indigo-400">
              {session?.fullName}
            </span>
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-purple-100 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 text-xs font-semibold">
          <Shield className="w-3.5 h-3.5" />
          <span>Super Admin Privileges Active</span>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Students"
          value={stats.totalStudents}
          subtext="Total across all schools"
          icon={Users}
          iconColor="text-indigo-500"
        />
        <StatCard
          title="Teaching Staff"
          value={stats.totalTeachers}
          subtext="Registered faculty profiles"
          icon={Users}
          iconColor="text-blue-500"
        />
        <StatCard
          title="Classes & Stream"
          value={stats.totalClasses}
          subtext="Configured grade levels"
          icon={Building2}
          iconColor="text-purple-500"
        />
        <StatCard
          title="Total Financial Revenue"
          value={formatCurrency(stats.monthlyRevenue)}
          subtext="System transaction volume"
          icon={Database}
          iconColor="text-emerald-500"
        />
      </div>

      {/* Recharts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Global Enrollment Distribution
          </h3>
          <EnrollmentChart data={stats.enrollmentByClass} />
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            System Revenue & Financial Collections
          </h3>
          <FeeCollectionChart data={stats.feeCollectionTrends} />
        </div>
      </div>

      {/* Audit & Activity Banner */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-indigo-400">
            <Activity className="w-4 h-4" />
            <h3 className="text-sm font-bold">Immutable System Audit Logging</h3>
          </div>
          <p className="text-xs text-slate-300 max-w-xl">
            Every creation, modification, payment transaction, and login event across all system roles is immutably logged into PostgreSQL.
          </p>
        </div>
        <Link
          href="/dashboard/audit-logs"
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-colors shrink-0"
        >
          <span>View Audit Ledger</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
