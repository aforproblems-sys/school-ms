import React from 'react';
import { getSession } from '@/lib/auth';
import { Receipt, DollarSign, Wallet, ShieldAlert, ArrowUpRight, Plus } from 'lucide-react';
import Link from 'next/link';

export default async function AccountantDashboard() {
  const session = await getSession();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Finance & Accounts Control
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Logged in as <span className="font-semibold text-slate-800 dark:text-slate-200">{session?.fullName}</span> • Financial ACID Transactions Isolation Active
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/finance/fees"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Collect Fee Payment</span>
          </Link>
        </div>
      </div>

      {/* Financial Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Term Revenue Collected</span>
            <Receipt className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">$142,800.00</p>
          <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
            <ArrowUpRight className="w-3 h-3" />
            <span>84% collection target achieved</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Pending Invoices</span>
            <ShieldAlert className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">$27,200.00</p>
          <span className="text-[11px] text-amber-600 font-medium">16 student invoices overdue</span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Monthly Payroll Disbursements</span>
            <Wallet className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">$68,500.00</p>
          <span className="text-[11px] text-slate-400 font-medium">Current period processed</span>
        </div>
      </div>

      {/* Operational Box */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-white space-y-3">
        <div className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-emerald-400" />
          <h3 className="text-sm font-bold">Transaction Integrity Guarantee</h3>
        </div>
        <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
          All payment collections, student fee invoice updates, and salary distributions operate under strict PostgreSQL atomic isolation (`prisma.$transaction`) to prevent partial states.
        </p>
      </div>
    </div>
  );
}
