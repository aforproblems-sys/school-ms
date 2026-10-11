'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { getAuditLogActionsAction, getAuditLogsAction, AuditLogItem } from '@/actions/audit-log.actions';

export default function AuditLogsPage() {
  const [actions, setActions] = useState<string[]>([]);
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [q, setQ] = useState('');
  const [entity, setEntity] = useState('');
  const [action, setAction] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [take, setTake] = useState(200);

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const displayLogs = useMemo(() => logs, [logs]);

  async function loadActions() {
    const res = await getAuditLogActionsAction();
    if (res.success) setActions(res.actions);
  }

  async function loadLogs() {
    setError(null);
    const res = await getAuditLogsAction({ q, entity, action, from: from || null, to: to || null, take });
    if (!res.success) {
      setError(res.error || 'Failed to load audit logs');
      setLogs([]);
      return;
    }
    setLogs(res.logs);
  }

  useEffect(() => {
    startTransition(async () => {
      await loadActions();
      await loadLogs();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onApply(e: React.FormEvent) {
    e.preventDefault();
    startTransition(() => void loadLogs());
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Audit Logs</h1>
        <p className="text-slate-400 text-sm">Search and review system activity.</p>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      <form onSubmit={onApply} className="rounded-xl border border-slate-800 bg-slate-950/30 p-4 space-y-4">
        <div className="grid gap-3 md:grid-cols-6">
          <div className="md:col-span-2">
            <label className="block text-xs text-slate-400 mb-1">Search</label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="email, entity, id, ip..."
              className="w-full rounded-md bg-slate-900 border border-slate-800 px-3 py-2 text-slate-100 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500/40"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Entity</label>
            <input
              value={entity}
              onChange={(e) => setEntity(e.target.value)}
              placeholder="e.g. Student"
              className="w-full rounded-md bg-slate-900 border border-slate-800 px-3 py-2 text-slate-100 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500/40"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Action</label>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="w-full rounded-md bg-slate-900 border border-slate-800 px-3 py-2 text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/40"
            >
              <option value="">All</option>
              {actions.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">From</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full rounded-md bg-slate-900 border border-slate-800 px-3 py-2 text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/40"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">To</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full rounded-md bg-slate-900 border border-slate-800 px-3 py-2 text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/40"
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-xs text-slate-400">
            Limit:{' '}
            <input
              type="number"
              min={1}
              max={500}
              value={take}
              onChange={(e) => setTake(Number(e.target.value))}
              className="w-24 rounded-md bg-slate-900 border border-slate-800 px-2 py-1 text-slate-100"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            {isPending ? 'Working…' : 'Apply'}
          </button>
        </div>
      </form>

      <div className="rounded-xl border border-slate-800 bg-slate-950/30">
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-white font-semibold">Logs</h2>
          <button onClick={() => startTransition(() => void loadLogs())} className="text-xs text-slate-300 hover:text-white" disabled={isPending}>
            Refresh
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-slate-400">
              <tr className="border-b border-slate-800">
                <th className="text-left px-4 py-3">Time</th>
                <th className="text-left px-4 py-3">User</th>
                <th className="text-left px-4 py-3">Action</th>
                <th className="text-left px-4 py-3">Entity</th>
                <th className="text-left px-4 py-3">Entity ID</th>
                <th className="text-left px-4 py-3">IP</th>
              </tr>
            </thead>
            <tbody className="text-slate-200">
              {displayLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-slate-400">
                    No logs found.
                  </td>
                </tr>
              ) : (
                displayLogs.map((l) => (
                  <tr key={l.id} className="border-b border-slate-900/80">
                    <td className="px-4 py-3 text-slate-300">
                      {new Date(l.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{l.userName ?? '—'}</div>
                      <div className="text-xs text-slate-400">{l.userEmail ?? ''}</div>
                    </td>
                    <td className="px-4 py-3 font-mono">{l.action}</td>
                    <td className="px-4 py-3">{l.entity}</td>
                    <td className="px-4 py-3 font-mono text-slate-300">{l.entityId ?? '—'}</td>
                    <td className="px-4 py-3 font-mono text-slate-300">{l.ipAddress ?? '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
