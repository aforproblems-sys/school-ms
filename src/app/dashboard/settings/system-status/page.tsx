'use client';

import React, { useEffect, useState } from 'react';
import {
  Database,
  HardDrive,
  ShieldCheck,
  RefreshCw,
  Download,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  FileCode,
  Server,
  Activity,
  Layers,
  FileText,
  Lock,
  Mail,
  MessageSquare,
  Phone,
} from 'lucide-react';
import { getSystemStatusAction, triggerManualBackupAction, SystemStatusData } from '@/actions/system-status.actions';

export default function SystemStatusPage() {
  const [statusData, setStatusData] = useState<SystemStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    setError(null);
    const res = await getSystemStatusAction();
    if (res.success && res.data) {
      setStatusData(res.data);
    } else {
      setError(res.error || 'Failed to fetch system status');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleManualBackup = async () => {
    setTriggering(true);
    setMessage(null);
    setError(null);
    const res = await triggerManualBackupAction();
    if (res.success) {
      setMessage(res.message || 'Backup generated successfully!');
      await fetchStatus();
    } else {
      setError(res.error || 'Failed to trigger backup');
    }
    setTriggering(false);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Top Banner & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              System Health & Backup Status
            </h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Production Active
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time infrastructure monitoring, storage usage metrics, database connectivity, and disaster recovery readiness.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchStatus}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleManualBackup}
            disabled={triggering || loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {triggering ? 'Creating Backup...' : 'Trigger Manual Backup'}
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

      {/* Health Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Database Health Card */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Database Connection</span>
            <Database className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {statusData?.database.connected ? 'Connected' : 'Offline'}
            </span>
            <span className="text-xs font-mono text-emerald-500">
              {statusData?.database.latencyMs}ms latency
            </span>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 font-mono space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div>Engine: {statusData?.database.version || 'PostgreSQL'}</div>
            <div>Active Connections: {statusData?.database.activeConnections || 1}</div>
          </div>
        </div>

        {/* Storage Metrics Card */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Media & File Storage</span>
            <HardDrive className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {formatBytes(statusData?.storage.totalSizeBytes || 0)}
            </span>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 font-mono space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div>Files Stored: {statusData?.storage.totalFiles || 0} assets</div>
            <div className="truncate">Dir: public/uploads</div>
          </div>
        </div>

        {/* Last Backup Card */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Latest Backup</span>
            <Server className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <span className="text-lg font-bold text-slate-900 dark:text-white block truncate">
              {statusData?.backups.lastBackupTimestamp
                ? new Date(statusData.backups.lastBackupTimestamp).toLocaleString()
                : 'No backups yet'}
            </span>
            <span className="inline-block mt-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              {statusData?.backups.lastBackupStatus || 'READY'}
            </span>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 font-mono pt-2 border-t border-slate-100 dark:border-slate-800">
            Total Backups: {statusData?.backups.totalBackups || 0}
          </div>
        </div>

        {/* Audit Log Security Card */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Immutable Audit Trail</span>
            <ShieldCheck className="w-5 h-5 text-purple-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {statusData?.auditLogs.totalLogs.toLocaleString() || 0}
            </span>
            <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">Immutable</span>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 font-mono pt-2 border-t border-slate-100 dark:border-slate-800 truncate">
            Last Activity: {statusData?.auditLogs.lastLogTimestamp ? new Date(statusData.auditLogs.lastLogTimestamp).toLocaleTimeString() : 'N/A'}
          </div>
        </div>
      </div>

      {/* Communication Channel Integration Status */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Activity className="w-4 h-4 text-indigo-500" />
          External Communication Integration Readiness
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-blue-500" />
              <div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Email Gateway</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">SMTP Provider</div>
              </div>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${statusData?.communication.emailConfigured ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-200 text-slate-600'}`}>
              {statusData?.communication.emailConfigured ? 'ACTIVE' : 'TEST MODE'}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-emerald-500" />
              <div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">WhatsApp Gateway</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Meta Cloud API</div>
              </div>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${statusData?.communication.whatsappConfigured ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-200 text-slate-600'}`}>
              {statusData?.communication.whatsappConfigured ? 'ACTIVE' : 'SIMULATED'}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-indigo-500" />
              <div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">SMS Gateway</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Twilio API</div>
              </div>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${statusData?.communication.smsConfigured ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-200 text-slate-600'}`}>
              {statusData?.communication.smsConfigured ? 'ACTIVE' : 'SIMULATED'}
            </span>
          </div>
        </div>
      </div>

      {/* Production Safety Warning & Runbook Info */}
      <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs space-y-2">
        <div className="flex items-center gap-2 font-bold text-sm">
          <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          Production Disaster Recovery & Safeguard Policy
        </div>
        <p className="leading-relaxed">
          In accordance with strict safety protocols, live database restorations cannot be triggered directly inside this web interface to prevent catastrophic accidental data loss. To perform a database restoration, follow the step-by-step developer runbook in <code className="bg-amber-200/50 dark:bg-amber-900/50 px-1.5 py-0.5 rounded font-mono">DISASTER_RECOVERY.md</code> using the CLI script <code className="bg-amber-200/50 dark:bg-amber-900/50 px-1.5 py-0.5 rounded font-mono">npx tsx src/scripts/restore-database.ts &lt;backup-file&gt;</code> against an isolated target database environment first.
        </p>
      </div>

      {/* Backup History Table */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-500" />
            Recent Backup Registry & Integrity Logs
          </h2>
          <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
            Configured Retention: {statusData?.backups.retentionDaily || 7} Daily | {statusData?.backups.retentionWeekly || 4} Weekly | {statusData?.backups.retentionMonthly || 12} Monthly
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="p-3">Timestamp</th>
                <th className="p-3">Filename</th>
                <th className="p-3">Type</th>
                <th className="p-3">Size</th>
                <th className="p-3">SHA-256 Checksum</th>
                <th className="p-3">Status</th>
                <th className="p-3">Triggered By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
              {statusData?.backups.history && statusData.backups.history.length > 0 ? (
                statusData.backups.history.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 text-slate-800 dark:text-slate-200 font-semibold">
                      {new Date(b.createdAt).toLocaleString()}
                    </td>
                    <td className="p-3 font-semibold text-indigo-600 dark:text-indigo-400">{b.filename}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {b.backupType}
                      </span>
                    </td>
                    <td className="p-3">{formatBytes(b.fileSizeBytes)}</td>
                    <td className="p-3 text-slate-400 font-mono" title={b.checksumSha256}>
                      {b.checksumSha256.substring(0, 16)}...
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                          b.status === 'VERIFIED'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : b.status === 'COMPLETED'
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {b.status === 'VERIFIED' && <CheckCircle2 className="w-3 h-3" />}
                        {b.status}
                      </span>
                    </td>
                    <td className="p-3 text-slate-500">{b.triggeredBy}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-400">
                    No backup history recorded yet. Click "Trigger Manual Backup" to generate the first snapshot.
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
