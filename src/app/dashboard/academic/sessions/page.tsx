'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import {
  AcademicSessionItem,
  createAcademicSessionAction,
  deleteAcademicSessionAction,
  getAcademicSessionsAction,
  setCurrentAcademicSessionAction,
} from '@/actions/academic.actions';

export default function AcademicSessionsPage() {
  const [sessions, setSessions] = useState<AcademicSessionItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [makeCurrent, setMakeCurrent] = useState(true);

  const currentId = useMemo(() => sessions.find((s) => s.isCurrent)?.id ?? null, [sessions]);

  async function load() {
    setError(null);
    const res = await getAcademicSessionsAction();
    if (!res.success) {
      setError(res.error || 'Failed to load academic sessions');
      setSessions([]);
      return;
    }
    setSessions(res.sessions);
  }

  useEffect(() => {
    startTransition(() => void load());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    startTransition(async () => {
      const res = await createAcademicSessionAction({
        name,
        startDate,
        endDate,
        makeCurrent,
      });

      if (!res.success) {
        setError(res.error || 'Failed to create session');
        return;
      }

      setInfo('Academic session created.');
      setName('');
      await load();
    });
  }

  function onSetCurrent(id: string) {
    setError(null);
    setInfo(null);

    startTransition(async () => {
      const res = await setCurrentAcademicSessionAction({ id });
      if (!res.success) {
        setError(res.error || 'Failed to set current session');
        return;
      }
      setInfo('Current session updated.');
      await load();
    });
  }

  function onDelete(id: string) {
    if (!confirm('Delete this academic session?')) return;

    setError(null);
    setInfo(null);

    startTransition(async () => {
      const res = await deleteAcademicSessionAction({ id });
      if (!res.success) {
        setError(res.error || 'Failed to delete session');
        return;
      }
      setInfo('Academic session deleted.');
      await load();
    });
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Academic Sessions</h1>
        <p className="text-slate-400 text-sm">
          Create sessions (e.g. 2025-2026), mark one as current, then manage classes/subjects inside it.
        </p>
      </div>

      {(error || info) && (
        <div
          className={[
            'rounded-lg border px-4 py-3 text-sm',
            error
              ? 'border-rose-500/40 bg-rose-500/10 text-rose-200'
              : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
          ].join(' ')}
        >
          {error ?? info}
        </div>
      )}

      <form onSubmit={onCreate} className="rounded-xl border border-slate-800 bg-slate-950/30 p-4 space-y-4">
        <h2 className="text-white font-semibold">Create Session</h2>

        <div className="grid gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <label className="block text-xs text-slate-400 mb-1">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. 2025-2026"
              className="w-full rounded-md bg-slate-900 border border-slate-800 px-3 py-2 text-slate-100 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500/40"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Start date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-md bg-slate-900 border border-slate-800 px-3 py-2 text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/40"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">End date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-md bg-slate-900 border border-slate-800 px-3 py-2 text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/40"
              required
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-200">
          <input type="checkbox" checked={makeCurrent} onChange={(e) => setMakeCurrent(e.target.checked)} />
          Make this the current session
        </label>

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
        >
          {isPending ? 'Working…' : 'Create'}
        </button>
      </form>

      <div className="rounded-xl border border-slate-800 bg-slate-950/30">
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-white font-semibold">Sessions</h2>
          <button
            onClick={() => startTransition(() => void load())}
            className="text-xs text-slate-300 hover:text-white"
            disabled={isPending}
          >
            Refresh
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-slate-400">
              <tr className="border-b border-slate-800">
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Dates</th>
                <th className="text-left px-4 py-3">Classes</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="text-slate-200">
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-slate-400">
                    No sessions yet. Create your first academic session.
                  </td>
                </tr>
              ) : (
                sessions.map((s) => (
                  <tr key={s.id} className="border-b border-slate-900/80">
                    <td className="px-4 py-3 font-medium">{s.name}</td>
                    <td className="px-4 py-3 text-slate-300">
                      {s.startDate} → {s.endDate}
                    </td>
                    <td className="px-4 py-3">{s.classCount}</td>
                    <td className="px-4 py-3">
                      {s.isCurrent ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-500/15 text-emerald-200 border border-emerald-500/30 px-2 py-0.5 text-xs">
                          Current
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-slate-800 text-slate-200 border border-slate-700 px-2 py-0.5 text-xs">
                          —
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => onSetCurrent(s.id)}
                          disabled={isPending || s.id === currentId}
                          className="rounded-md border border-slate-700 px-3 py-1.5 text-xs hover:bg-slate-800 disabled:opacity-50"
                        >
                          Set current
                        </button>
                        <button
                          onClick={() => onDelete(s.id)}
                          disabled={isPending}
                          className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-200 hover:bg-rose-500/15 disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
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
