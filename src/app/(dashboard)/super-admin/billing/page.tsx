'use client';

import React, { useEffect, useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  ShieldCheck,
  Zap,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Building2,
  Receipt,
  FileCode,
  Layers,
  Activity,
  Play,
  RotateCcw,
} from 'lucide-react';
import {
  getPlatformBillingOverviewAction,
  simulateBillingEventAction,
} from '@/actions/billing.actions';
import { SubscriptionPlan } from '@prisma/client';

export default function PlatformBillingPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [targetSchoolId, setTargetSchoolId] = useState('default-primary-school');
  const [targetPlan, setTargetPlan] = useState<SubscriptionPlan>('PROFESSIONAL');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = async () => {
    setLoading(true);
    setError(null);
    const res = await getPlatformBillingOverviewAction();
    if (res.success && res.data) {
      setData(res.data);
    } else {
      setError(res.error || 'Failed to load billing overview.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const handleSimulate = async (type: 'PAYMENT_SUCCESS' | 'PAYMENT_FAILED' | 'TRIAL_EXPIRED' | 'RENEWAL' | 'CANCELLATION' | 'DUPLICATE_WEBHOOK') => {
    setSimulating(true);
    setMessage(null);
    setError(null);

    const res = await simulateBillingEventAction(type, targetSchoolId, targetPlan);
    if (res.success) {
      setMessage(res.message || 'Simulation executed');
      await fetchOverview();
    } else {
      setError(res.error || 'Simulation failed');
    }
    setSimulating(false);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
              Platform Revenue & Billing Administration
            </h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Activity className="w-3.5 h-3.5" />
              Idempotent Webhooks Engine Active
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Global SaaS revenue statistics, monthly recurring revenue (MRR), webhook event logs, and test mode event simulators.
          </p>
        </div>

        <button
          onClick={fetchOverview}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Metrics
        </button>
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

      {/* Revenue Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Monthly Recurring Revenue (MRR)</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {data?.currency} ${data?.mrrUsd || 0}
            </span>
            <span className="text-xs text-emerald-500 font-semibold">Active Run Rate</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Active Paid Subscriptions</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-white">{data?.activeSubs || 0}</span>
            <span className="text-xs text-indigo-500 font-semibold">Tenants</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Trial Subscriptions</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-blue-600 dark:text-blue-400">{data?.trialSubs || 0}</span>
            <span className="text-xs text-blue-500 font-semibold">Evaluating</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Past Due / Expired</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-rose-600 dark:text-rose-400">{data?.pastDueSubs || 0}</span>
            <span className="text-xs text-rose-500 font-semibold">Attention</span>
          </div>
        </div>
      </div>

      {/* Test Mode Event Simulator Section */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Play className="w-4 h-4 text-indigo-500" />
          Test Mode Billing Simulator (Webhook & State Engine)
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Simulate payment gateway events and verify subscription state changes, invoice status transitions, and idempotency protection without processing real money.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <input
            type="text"
            placeholder="Target School Tenant ID"
            value={targetSchoolId}
            onChange={(e) => setTargetSchoolId(e.target.value)}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono text-slate-800 dark:text-slate-200 w-64"
          />

          <select
            value={targetPlan}
            onChange={(e) => setTargetPlan(e.target.value as SubscriptionPlan)}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200"
          >
            <option value="BASIC">BASIC ($49/mo)</option>
            <option value="PROFESSIONAL">PROFESSIONAL ($149/mo)</option>
            <option value="ENTERPRISE">ENTERPRISE ($399/mo)</option>
          </select>

          <button
            onClick={() => handleSimulate('PAYMENT_SUCCESS')}
            disabled={simulating}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm"
          >
            Simulate Payment Success
          </button>

          <button
            onClick={() => handleSimulate('PAYMENT_FAILED')}
            disabled={simulating}
            className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm"
          >
            Simulate Payment Failure
          </button>

          <button
            onClick={() => handleSimulate('CANCELLATION')}
            disabled={simulating}
            className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-sm"
          >
            Simulate Cancellation
          </button>

          <button
            onClick={() => handleSimulate('DUPLICATE_WEBHOOK')}
            disabled={simulating}
            className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-sm"
          >
            Test Idempotent Webhook Replay
          </button>
        </div>
      </div>

      {/* Webhook Logs Audit Trail */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <FileCode className="w-4 h-4 text-indigo-500" />
          Recent Webhook Execution Logs
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="p-3">Timestamp</th>
                <th className="p-3">Event ID</th>
                <th className="p-3">Provider</th>
                <th className="p-3">Event Type</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
              {data?.webhookLogs && data.webhookLogs.length > 0 ? (
                data.webhookLogs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 text-slate-500">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="p-3 font-semibold text-indigo-600 dark:text-indigo-400">{log.eventId}</td>
                    <td className="p-3">{log.provider}</td>
                    <td className="p-3">{log.eventType}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.status === 'PROCESSED'
                            ? 'bg-emerald-500/10 text-emerald-600'
                            : log.status === 'IGNORED'
                            ? 'bg-amber-500/10 text-amber-600'
                            : 'bg-rose-500/10 text-rose-600'
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-400">
                    No webhook execution logs recorded yet. Use the simulator above to emit test billing webhooks.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
