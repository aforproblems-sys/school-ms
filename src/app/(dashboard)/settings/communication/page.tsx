'use client';

import React, { useState, useEffect } from 'react';
import {
  getCommunicationLogsAction,
  getCommunicationConfigAction,
  updateCommunicationConfigAction,
  retryCommunicationLogAction,
} from '@/actions/communication.actions';
import { useRealtime } from '@/hooks/use-realtime';
import {
  Radio,
  Mail,
  MessageCircle,
  PhoneCall,
  ShieldAlert,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Filter,
  Search,
  Sparkles,
  Save,
  Check,
  XCircle,
  Clock,
} from 'lucide-react';

interface ConfigState {
  emailEnabled: boolean;
  whatsappEnabled: boolean;
  smsEnabled: boolean;
  testModeEnabled: boolean;
  providers: {
    email: { ready: boolean; providerName: string };
    whatsapp: { ready: boolean; providerName: string };
    sms: { ready: boolean; providerName: string };
  };
}

interface LogItem {
  id: string;
  userId: string;
  userName: string;
  channel: string;
  provider: string;
  messageType: string;
  recipient: string;
  status: string;
  attemptCount: number;
  maxAttempts: number;
  failureReason: string | null;
  sentAt: string | null;
  createdAt: string;
}

export default function CommunicationSettingsPage() {
  const [config, setConfig] = useState<ConfigState | null>(null);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [channelFilter, setChannelFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = () => {
    setLoading(true);
    Promise.all([
      getCommunicationConfigAction(),
      getCommunicationLogsAction({ channel: channelFilter, status: statusFilter, search: searchQuery, limit: 30 }),
    ]).then(([configRes, logsRes]) => {
      if (configRes.success && configRes.config) {
        setConfig(configRes.config as any);
      }
      if (logsRes.success) {
        setLogs(logsRes.logs);
        setTotalLogs(logsRes.total);
      }
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, [channelFilter, statusFilter]);

  // Subscribe to Live SSE Communication Updates
  useRealtime({
    channels: ['dashboard'],
    onEvent: (eventPayload) => {
      if (eventPayload.type === 'communication:status_updated') {
        loadData();
      }
    },
  });

  const handleToggleChannel = async (key: 'emailEnabled' | 'whatsappEnabled' | 'smsEnabled' | 'testModeEnabled', value: boolean) => {
    if (!config) return;
    const updated = { ...config, [key]: value };
    setConfig(updated);
    setSavingConfig(true);

    const res = await updateCommunicationConfigAction({
      emailEnabled: updated.emailEnabled,
      whatsappEnabled: updated.whatsappEnabled,
      smsEnabled: updated.smsEnabled,
      testModeEnabled: updated.testModeEnabled,
    });

    setSavingConfig(false);
    if (res.success) {
      setStatusMsg({ type: 'success', text: 'Communication setting updated.' });
    } else {
      setStatusMsg({ type: 'error', text: res.error || 'Failed to update setting.' });
    }
  };

  const handleRetry = async (logId: string) => {
    const res = await retryCommunicationLogAction(logId);
    if (res.success) {
      setStatusMsg({ type: 'success', text: 'Communication retry dispatched.' });
      loadData();
    } else {
      setStatusMsg({ type: 'error', text: res.error || 'Retry failed.' });
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight flex items-center gap-2">
            <Radio className="w-6 h-6 text-indigo-600" />
            External Communication Integration Layer
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Provider-independent Email, WhatsApp, and SMS async dispatch, Test Mode, and delivery logs.
          </p>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
          }`}
        >
          {statusMsg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Test Mode Warning Banner */}
      {config && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
            config.testModeEnabled
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
              : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-6 h-6 shrink-0" />
            <div>
              <p className="text-xs font-bold">
                {config.testModeEnabled ? 'TEST MODE ENABLED' : 'PRODUCTION MODE ACTIVE'}
              </p>
              <p className="text-[11px] opacity-90 mt-0.5">
                {config.testModeEnabled
                  ? 'External messages (WhatsApp, SMS, Email) are safely simulated without transmitting real messages.'
                  : 'External communication messages will be transmitted live via configured provider APIs.'}
              </p>
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs font-bold cursor-pointer shrink-0">
            <span>Test Mode</span>
            <input
              type="checkbox"
              checked={config.testModeEnabled}
              onChange={(e) => handleToggleChannel('testModeEnabled', e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
            />
          </label>
        </div>
      )}

      {/* Channels Status Cards */}
      {config && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Email Channel Card */}
          <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 flex items-center justify-center">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-gray-900 dark:text-white">Email Channel</h3>
                  <span className="text-[10px] text-gray-400 font-mono">
                    {config.providers.email.providerName}
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={config.emailEnabled}
                onChange={(e) => handleToggleChannel('emailEnabled', e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* WhatsApp Channel Card */}
          <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-gray-900 dark:text-white">WhatsApp Channel</h3>
                  <span className="text-[10px] text-gray-400 font-mono">
                    {config.providers.whatsapp.providerName}
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={config.whatsappEnabled}
                onChange={(e) => handleToggleChannel('whatsappEnabled', e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* SMS Channel Card */}
          <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 flex items-center justify-center">
                  <PhoneCall className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-gray-900 dark:text-white">SMS Channel</h3>
                  <span className="text-[10px] text-gray-400 font-mono">
                    {config.providers.sms.providerName}
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={config.smsEnabled}
                onChange={(e) => handleToggleChannel('smsEnabled', e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Delivery Logs Header & Filters */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-700 pb-4">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">
              Communication Delivery Logs ({totalLogs})
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Real-time audit log of external email, WhatsApp, and SMS delivery jobs.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Channels</option>
              <option value="EMAIL">Email</option>
              <option value="WHATSAPP">WhatsApp</option>
              <option value="SMS">SMS</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="SENT">Sent</option>
              <option value="FAILED">Failed</option>
              <option value="PROCESSING">Processing</option>
              <option value="PENDING">Pending</option>
            </select>
          </div>
        </div>

        {/* Delivery Logs Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-700 dark:text-gray-300">
            <thead className="bg-gray-50 dark:bg-gray-700/50 text-[11px] uppercase font-bold text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3">Recipient</th>
                <th className="px-4 py-3">Channel</th>
                <th className="px-4 py-3">Message Type</th>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Attempts</th>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-xs text-gray-400 animate-pulse">
                    Loading delivery logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-xs text-gray-400">
                    No communication delivery logs recorded.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const isSent = log.status === 'SENT';
                  const isFailed = log.status === 'FAILED';

                  return (
                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                      <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">
                        <p>{log.recipient}</p>
                        <p className="text-[10px] text-gray-400 font-normal">{log.userName}</p>
                      </td>
                      <td className="px-4 py-3 font-bold">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] ${
                            log.channel === 'EMAIL'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                              : log.channel === 'WHATSAPP'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                          }`}
                        >
                          {log.channel}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-gray-600 dark:text-gray-300">
                        {log.messageType}
                      </td>
                      <td className="px-4 py-3 font-mono text-[10px] text-gray-500">
                        {log.provider}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                            isSent
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : isFailed
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          }`}
                        >
                          {isSent ? <Check className="w-3 h-3" /> : isFailed ? <XCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          <span>{log.status}</span>
                        </span>
                        {log.failureReason && (
                          <p className="text-[9px] text-rose-500 mt-0.5 truncate max-w-xs">{log.failureReason}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-center">
                        {log.attemptCount}/{log.maxAttempts}
                      </td>
                      <td className="px-4 py-3 text-[10px] text-gray-500 font-mono">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isFailed && (
                          <button
                            onClick={() => handleRetry(log.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold rounded-lg bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Retry</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
