'use client';

import React, { useState, useEffect, useTransition } from 'react';
import {
  getStudentFeeInvoicesAction,
  getPaymentHistoryAction,
  getFeeStructuresAction,
} from '@/actions/fee.actions';
import { getClassOptionsAction } from '@/actions/student.actions';
import { StatusBadge } from '@/components/shared/status-badge';
import { EmptyState } from '@/components/shared/empty-state';
import { CreateFeeStructureDialog } from '@/components/finance/create-fee-structure-dialog';
import { AssignFeeDialog } from '@/components/finance/assign-fee-dialog';
import { CollectPaymentDialog } from '@/components/finance/collect-payment-dialog';
import { FeeReceiptModal } from '@/components/finance/fee-receipt-modal';
import {
  Receipt,
  PlusCircle,
  Send,
  Search,
  Filter,
  DollarSign,
  CreditCard,
  History,
  Building2,
  TrendingUp,
  Clock,
  Printer,
  Loader2,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';

export default function FeeManagementPage() {
  const [isPending, startTransition] = useTransition();

  // Active Tab: INVOICES | HISTORY | STRUCTURES
  const [activeTab, setActiveTab] = useState<'INVOICES' | 'HISTORY' | 'STRUCTURES'>('INVOICES');

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [classFilter, setClassFilter] = useState('');
  const [page, setPage] = useState(1);

  // Data State
  const [invoicesData, setInvoicesData] = useState<{
    invoices: Array<any>;
    total: number;
    page: number;
    totalPages: number;
    summary: {
      totalInvoiced: number;
      totalCollected: number;
      totalPending: number;
      collectionRate: number;
    };
  }>({
    invoices: [],
    total: 0,
    page: 1,
    totalPages: 1,
    summary: { totalInvoiced: 0, totalCollected: 0, totalPending: 0, collectionRate: 100 },
  });

  const [paymentHistory, setPaymentHistory] = useState<Array<any>>([]);
  const [feeStructures, setFeeStructures] = useState<Array<any>>([]);
  const [classList, setClassList] = useState<Array<{ id: string; name: string }>>([]);

  // Modal Dialog Control States
  const [isStructureOpen, setIsStructureOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [selectedInvoiceToPay, setSelectedInvoiceToPay] = useState<any | null>(null);
  const [selectedPaymentReceiptId, setSelectedPaymentReceiptId] = useState<string | null>(null);

  // Load Class options once
  useEffect(() => {
    getClassOptionsAction().then((res) => {
      if (res.success && res.classes) setClassList(res.classes);
    });
  }, []);

  // Fetch data based on active tab & filters
  const fetchData = () => {
    startTransition(async () => {
      if (activeTab === 'INVOICES') {
        const res = await getStudentFeeInvoicesAction({
          page,
          limit: 10,
          search,
          status: statusFilter,
          classId: classFilter,
        });
        if (res.success) setInvoicesData(res as any);
      } else if (activeTab === 'HISTORY') {
        const res = await getPaymentHistoryAction({ search, limit: 30 });
        if (res.success) setPaymentHistory(res.payments);
      } else if (activeTab === 'STRUCTURES') {
        const res = await getFeeStructuresAction();
        if (res.success) setFeeStructures(res.structures);
      }
    });
  };

  useEffect(() => {
    fetchData();
  }, [activeTab, page, statusFilter, classFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchData();
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">
            <Receipt className="w-4 h-4" />
            <span>Financial Operations</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Fees & Billing Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
            Configure fee structures, issue invoices, record partial or full payments, and issue computer-generated printable official receipts.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsStructureOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <PlusCircle className="w-3.5 h-3.5 text-indigo-500" />
            <span>New Fee Rate</span>
          </button>
          <button
            onClick={() => setIsAssignOpen(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition-all"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Assign Fee Bill</span>
          </button>
        </div>
      </div>

      {/* Financial Executive Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Invoiced */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Invoiced</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white">
            PKR {invoicesData.summary.totalInvoiced.toLocaleString('en-PK', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-slate-400 font-medium">Cumulative gross billed fees</p>
        </div>

        {/* Total Collected */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Revenue Collected</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
            PKR {invoicesData.summary.totalCollected.toLocaleString('en-PK', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-slate-400 font-medium">Realized revenue in bank account</p>
        </div>

        {/* Total Pending */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pending Balance</span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold font-mono text-amber-600 dark:text-amber-400">
            PKR {invoicesData.summary.totalPending.toLocaleString('en-PK', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-slate-400 font-medium">Outstanding uncollected invoices</p>
        </div>

        {/* Collection Rate % */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Collection Rate</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">
            {invoicesData.summary.collectionRate}%
          </p>
          <p className="text-[10px] text-slate-400 font-medium">Realized vs billed efficiency ratio</p>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6">
        <button
          onClick={() => setActiveTab('INVOICES')}
          className={`pb-3 text-xs font-bold transition-all relative ${
            activeTab === 'INVOICES'
              ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
          }`}
        >
          Student Fee Invoices ({invoicesData.total})
        </button>
        <button
          onClick={() => setActiveTab('HISTORY')}
          className={`pb-3 text-xs font-bold transition-all relative ${
            activeTab === 'HISTORY'
              ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
          }`}
        >
          Payment Receipts Log
        </button>
        <button
          onClick={() => setActiveTab('STRUCTURES')}
          className={`pb-3 text-xs font-bold transition-all relative ${
            activeTab === 'STRUCTURES'
              ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
          }`}
        >
          Fee Structures Registry
        </button>
      </div>

      {/* TAB 1: INVOICES LIST */}
      {activeTab === 'INVOICES' && (
        <div className="space-y-4">
          {/* Search & Filter Toolbar */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
            <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
              <input
                type="text"
                placeholder="Search by invoice #, student name, or admission number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </form>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              >
                <option value="ALL">All Statuses</option>
                <option value="UNPAID">Unpaid Only</option>
                <option value="PARTIALLY_PAID">Partially Paid</option>
                <option value="PAID">Fully Paid</option>
              </select>

              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              >
                <option value="">All Class Grades</option>
                {classList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Invoices Table Card */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            {isPending ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                <p className="text-xs">Loading fee invoices from database...</p>
              </div>
            ) : invoicesData.invoices.length === 0 ? (
              <EmptyState
                icon={Receipt}
                title="No Fee Invoices Found"
                description="Assign fee bills to students or adjust search filters."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-100 dark:border-slate-800 font-semibold uppercase tracking-wider text-[11px]">
                      <th className="pb-3">Invoice #</th>
                      <th className="pb-3">Student Name</th>
                      <th className="pb-3">Class</th>
                      <th className="pb-3">Fee Title</th>
                      <th className="pb-3 text-right">Invoiced (PKR)</th>
                      <th className="pb-3 text-right">Paid (PKR)</th>
                      <th className="pb-3 text-right">Balance (PKR)</th>
                      <th className="pb-3 text-center">Status</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                    {invoicesData.invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 font-mono font-semibold text-slate-900 dark:text-white">
                          {inv.invoiceNo}
                        </td>
                        <td className="py-3">
                          <p className="font-semibold text-slate-900 dark:text-white">{inv.studentName}</p>
                          <p className="text-[10px] text-slate-400">{inv.admissionNo}</p>
                        </td>
                        <td className="py-3 font-medium text-slate-500 dark:text-slate-400">
                          {inv.className} ({inv.sectionName})
                        </td>
                        <td className="py-3 font-medium text-slate-800 dark:text-slate-200">
                          {inv.feeName}
                        </td>
                        <td className="py-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                          PKR {inv.amount.toFixed(2)}
                        </td>
                        <td className="py-3 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                          PKR {inv.paidAmount.toFixed(2)}
                        </td>
                        <td className="py-3 text-right font-mono font-extrabold text-indigo-600 dark:text-indigo-400">
                          PKR {inv.remainingBalance.toFixed(2)}
                        </td>
                        <td className="py-3 text-center">
                          <StatusBadge status={inv.status} />
                        </td>
                        <td className="py-3 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            {inv.remainingBalance > 0 && (
                              <button
                                onClick={() => setSelectedInvoiceToPay(inv)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-sm flex items-center gap-1 transition-all"
                              >
                                <CreditCard className="w-3.5 h-3.5" />
                                <span>Pay</span>
                              </button>
                            )}

                            {inv.latestPaymentId && (
                              <button
                                onClick={() => setSelectedPaymentReceiptId(inv.latestPaymentId)}
                                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                                title="Print Receipt"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {invoicesData.totalPages > 1 && (
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                <span>Page {invoicesData.page} of {invoicesData.totalPages}</span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={invoicesData.page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={invoicesData.page >= invoicesData.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PAYMENT HISTORY */}
      {activeTab === 'HISTORY' && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Recent Payment Transactions</h2>
            <span className="text-xs text-slate-400">Official receipt logs</span>
          </div>

          {paymentHistory.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">No payment receipts logged yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-100 dark:border-slate-800 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="pb-3">Receipt #</th>
                    <th className="pb-3">Payment Date</th>
                    <th className="pb-3">Student</th>
                    <th className="pb-3">Class</th>
                    <th className="pb-3">Payment Method</th>
                    <th className="pb-3 text-right">Amount Paid</th>
                    <th className="pb-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                  {paymentHistory.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">{p.receiptNo}</td>
                      <td className="py-3 font-medium text-slate-500 dark:text-slate-400">
                        {new Date(p.paymentDate).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="py-3 font-semibold text-slate-900 dark:text-white">{p.studentName} ({p.admissionNo})</td>
                      <td className="py-3 text-slate-500 font-medium">{p.className}</td>
                      <td className="py-3 font-mono uppercase text-[11px] text-slate-700 dark:text-slate-300">{p.paymentMethod.replace('_', ' ')}</td>
                      <td className="py-3 text-right font-mono font-extrabold text-emerald-600 dark:text-emerald-400">${p.amount.toFixed(2)}</td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => setSelectedPaymentReceiptId(p.id)}
                          className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs inline-flex items-center gap-1 transition-all"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>View Receipt</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: FEE STRUCTURES */}
      {activeTab === 'STRUCTURES' && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Active Fee Structures Registry</h2>
            <button
              onClick={() => setIsStructureOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold flex items-center gap-1"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Create Structure</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {feeStructures.map((s) => (
              <div key={s.id} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{s.class.name}</span>
                  <span className="font-mono font-extrabold text-base text-emerald-600 dark:text-emerald-400">${Number(s.amount).toFixed(2)}</span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{s.name}</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Session: {s.session.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      <CreateFeeStructureDialog
        isOpen={isStructureOpen}
        onClose={() => setIsStructureOpen(false)}
        onSuccess={fetchData}
      />

      <AssignFeeDialog
        isOpen={isAssignOpen}
        onClose={() => setIsAssignOpen(false)}
        onSuccess={fetchData}
      />

      <CollectPaymentDialog
        isOpen={Boolean(selectedInvoiceToPay)}
        invoice={selectedInvoiceToPay}
        onClose={() => setSelectedInvoiceToPay(null)}
        onSuccess={(receipt) => {
          fetchData();
          setSelectedPaymentReceiptId(receipt.paymentId);
        }}
      />

      <FeeReceiptModal
        isOpen={Boolean(selectedPaymentReceiptId)}
        paymentId={selectedPaymentReceiptId}
        onClose={() => setSelectedPaymentReceiptId(null)}
      />
    </div>
  );
}
