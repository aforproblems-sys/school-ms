'use client';

import React, { useEffect, useState } from 'react';
import {
  CreditCard,
  ShieldCheck,
  Zap,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Users,
  HardDrive,
  Download,
  Calendar,
  Sparkles,
  ArrowRight,
  Receipt,
  FileText,
  Lock,
} from 'lucide-react';
import {
  getSchoolSubscriptionAction,
  getSchoolInvoicesAction,
  createCheckoutAction,
  cancelSubscriptionAction,
  SchoolSubscriptionData,
} from '@/actions/billing.actions';
import { SubscriptionPlan } from '@prisma/client';

export default function SubscriptionPage() {
  const [subData, setSubData] = useState<SchoolSubscriptionData | null>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscriptionInfo = async () => {
    setLoading(true);
    setError(null);
    const [subRes, invRes] = await Promise.all([
      getSchoolSubscriptionAction(),
      getSchoolInvoicesAction(),
    ]);

    if (subRes.success && subRes.data) {
      setSubData(subRes.data);
    } else {
      setError(subRes.error || 'Failed to fetch subscription data.');
    }

    if (invRes.success && invRes.invoices) {
      setInvoices(invRes.invoices);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchSubscriptionInfo();
  }, []);

  const handleCheckout = async (plan: SubscriptionPlan) => {
    setUpgrading(true);
    setMessage(null);
    setError(null);

    const res = await createCheckoutAction(plan);
    if (res.success && res.checkoutUrl) {
      // In Test Mode, execute redirect/callback
      window.location.href = res.checkoutUrl;
    } else {
      setError(res.error || 'Failed to create checkout session.');
      setUpgrading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to schedule subscription cancellation at period end? Your data will remain 100% preserved.')) {
      return;
    }

    const res = await cancelSubscriptionAction();
    if (res.success) {
      setMessage(res.message || 'Cancellation scheduled.');
      await fetchSubscriptionInfo();
    } else {
      setError(res.error || 'Failed to cancel subscription.');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <CreditCard className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
              SaaS Subscription & Billing
            </h1>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                subData?.status === 'ACTIVE'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                  : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {subData?.planName || 'Active Tier'}
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage your school tenant subscription tier, resource capacity limits, feature flags, and billing invoices.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchSubscriptionInfo}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={() => setShowPlanModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            Upgrade Plan
          </button>
        </div>
      </div>

      {/* Notifications */}
      {message && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Current Subscription Status Card */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="text-xs text-indigo-300 font-mono tracking-wider uppercase">
              Current Billing Plan
            </div>
            <h2 className="text-3xl font-extrabold">{subData?.planName}</h2>
            <p className="text-xs text-slate-300">
              {subData?.currency} ${subData?.monthlyPrice} / Month • Status: <span className="font-bold text-emerald-400">{subData?.status}</span>
            </p>
          </div>

          <div className="space-y-2 text-right">
            <div className="text-xs text-slate-300 font-mono">
              Next Billing / Period End:
            </div>
            <div className="text-sm font-bold text-indigo-200">
              {subData?.currentPeriodEnd ? new Date(subData.currentPeriodEnd).toLocaleDateString() : 'N/A'}
            </div>
            {subData?.cancelAtPeriodEnd ? (
              <span className="inline-block px-2.5 py-0.5 rounded text-[11px] bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                Cancellation Scheduled
              </span>
            ) : (
              <button
                onClick={handleCancelSubscription}
                className="text-[11px] text-slate-400 hover:text-rose-300 underline font-medium"
              >
                Cancel Subscription
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Resource Capacity Progress Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        {/* Students Capacity */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Enrolled Students</span>
            <Users className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {subData?.usage.studentsCount} / {subData?.usage.maxStudents}
            </span>
            <span className="text-xs text-indigo-500 font-semibold">
              {Math.round(((subData?.usage.studentsCount || 0) / (subData?.usage.maxStudents || 1)) * 100)}%
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-indigo-600 rounded-full transition-all"
              style={{
                width: `${Math.min(100, ((subData?.usage.studentsCount || 0) / (subData?.usage.maxStudents || 1)) * 100)}%`,
              }}
            />
          </div>
        </div>

        {/* Teachers Capacity */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Teacher Accounts</span>
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {subData?.usage.teachersCount} / {subData?.usage.maxTeachers}
            </span>
            <span className="text-xs text-emerald-500 font-semibold">
              {Math.round(((subData?.usage.teachersCount || 0) / (subData?.usage.maxTeachers || 1)) * 100)}%
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{
                width: `${Math.min(100, ((subData?.usage.teachersCount || 0) / (subData?.usage.maxTeachers || 1)) * 100)}%`,
              }}
            />
          </div>
        </div>

        {/* Administrators Capacity */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">School Administrators</span>
            <Lock className="w-5 h-5 text-purple-500" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {subData?.usage.adminsCount} / {subData?.usage.maxAdmins}
            </span>
            <span className="text-xs text-purple-500 font-semibold">
              {Math.round(((subData?.usage.adminsCount || 0) / (subData?.usage.maxAdmins || 1)) * 100)}%
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-purple-600 rounded-full transition-all"
              style={{
                width: `${Math.min(100, ((subData?.usage.adminsCount || 0) / (subData?.usage.maxAdmins || 1)) * 100)}%`,
              }}
            />
          </div>
        </div>

        {/* Media Storage Quota */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Storage Quota</span>
            <HardDrive className="w-5 h-5 text-amber-500" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {subData?.usage.storageMbUsed} MB / {subData?.usage.maxStorageMb} MB
            </span>
            <span className="text-xs text-amber-500 font-semibold">
              {Math.round(((subData?.usage.storageMbUsed || 0) / (subData?.usage.maxStorageMb || 1)) * 100)}%
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all"
              style={{
                width: `${Math.min(100, ((subData?.usage.storageMbUsed || 0) / (subData?.usage.maxStorageMb || 1)) * 100)}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Feature Availability Checklist */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Zap className="w-4 h-4 text-indigo-500" />
          Included Subscription Features & Modules
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { key: 'bulk_import', label: 'Bulk Student & CSV Import' },
            { key: 'whatsapp_notifications', label: 'WhatsApp Parent Alerts' },
            { key: 'sms_notifications', label: 'SMS Gateway Integration' },
            { key: 'advanced_reports', label: 'PDF Report Card Generator' },
            { key: 'advanced_analytics', label: 'Advanced Analytics Dashboard' },
            { key: 'api_access', label: 'Developer REST API Access' },
          ].map((feat) => {
            const isUnlocked = subData?.features.includes(feat.key);
            return (
              <div
                key={feat.key}
                className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-semibold ${
                  isUnlocked
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400'
                }`}
              >
                <span>{feat.label}</span>
                {isUnlocked ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <Lock className="w-4 h-4 text-slate-400 shrink-0" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Invoice History Table */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Receipt className="w-4 h-4 text-indigo-500" />
          Billing Invoice History
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="p-3">Invoice Number</th>
                <th className="p-3">Plan</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Invoice Date</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Payment Ref</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
              {invoices.length > 0 ? (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-bold text-indigo-600 dark:text-indigo-400">{inv.invoiceNumber}</td>
                    <td className="p-3">{inv.plan}</td>
                    <td className="p-3 font-semibold text-slate-900 dark:text-white">
                      {inv.currency} ${inv.amount}
                    </td>
                    <td className="p-3 text-slate-500">{new Date(inv.invoiceDate).toLocaleDateString()}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600">
                        {inv.status}
                      </span>
                    </td>
                    <td className="p-3 text-right text-slate-400">{inv.paymentRef || 'N/A'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-400">
                    No invoice records found for this school.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Plan Upgrade Modal */}
      {showPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-500" />
                Select Subscription Tier
              </h2>
              <button
                onClick={() => setShowPlanModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                { plan: 'BASIC' as SubscriptionPlan, name: 'BASIC', price: 'PKR 49', students: '300 Students', teachers: '30 Teachers', storage: '5 GB' },
                { plan: 'PROFESSIONAL' as SubscriptionPlan, name: 'PROFESSIONAL', price: 'PKR 149', students: '1,500 Students', teachers: '100 Teachers', storage: '25 GB' },
                { plan: 'ENTERPRISE' as SubscriptionPlan, name: 'ENTERPRISE', price: 'PKR 399', students: '10,000 Students', teachers: '500 Teachers', storage: '100 GB' },
              ].map((p) => (
                <div
                  key={p.plan}
                  className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 flex flex-col justify-between space-y-4 hover:border-indigo-500 transition-all"
                >
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{p.name}</span>
                    <div className="text-2xl font-extrabold text-slate-900 dark:text-white">{p.price} <span className="text-xs text-slate-400 font-normal">/ mo</span></div>
                    <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 pt-2">
                      <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> {p.students}</li>
                      <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> {p.teachers}</li>
                      <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> {p.storage} Storage</li>
                    </ul>
                  </div>

                  <button
                    onClick={() => handleCheckout(p.plan)}
                    disabled={upgrading}
                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors shadow-md disabled:opacity-50"
                  >
                    {upgrading ? 'Processing...' : `Upgrade to ${p.name}`}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
