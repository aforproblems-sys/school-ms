'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import {
  createStaffMemberAction,
  deactivateStaffMemberAction,
  listStaffMembersAction,
  StaffMemberRow,
} from '@/actions/staff-member.actions';

export default function StaffDirectoryClient() {
  const [rows, setRows] = useState<StaffMemberRow[]>([]);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [designation, setDesignation] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [monthlyPay, setMonthlyPay] = useState('');
  const [joiningDate, setJoiningDate] = useState('');
  const [notes, setNotes] = useState('');

  async function load() {
    setError(null);
    const res = await listStaffMembersAction();
    if (!res.success) {
      setError(res.error || 'Failed to load staff');
      setRows([]);
      return;
    }
    setRows(res.staff);
  }

  useEffect(() => {
    startTransition(() => void load());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const res: any = await createStaffMemberAction({
        fullName,
        designation,
        phoneNumber: phoneNumber || null,
        monthlyPay: monthlyPay || null,
        joiningDate: joiningDate || null,
        notes: notes || null,
      });

      if (!res.success) {
        if (res.fieldErrors) {
          const parts: string[] = [];
          for (const [k, v] of Object.entries(res.fieldErrors)) {
            if (Array.isArray(v) && v.length) parts.push(`${k}: ${v.join(', ')}`);
          }
          setError(parts.length ? parts.join(' | ') : (res.error || 'Validation failed'));
        } else {
          setError(res.error || 'Failed to create staff');
        }
        return;
      }

      setFullName('');
      setDesignation('');
      setPhoneNumber('');
      setMonthlyPay('');
      setJoiningDate('');
      setNotes('');
      await load();
    });
  }

  const data = useMemo(() => rows, [rows]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Staff Directory (Non‑Login)</h1>
        <p className="text-slate-400 text-sm">Mali, guard, cleaner, driver etc. No login accounts.</p>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      <form onSubmit={onCreate} className="rounded-xl border border-slate-800 bg-slate-950/30 p-4 space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Full Name</label>
            <input className="w-full rounded-md bg-slate-900 border border-slate-800 px-3 py-2 text-slate-100"
              value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Designation</label>
            <input className="w-full rounded-md bg-slate-900 border border-slate-800 px-3 py-2 text-slate-100"
              value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="Guard / Cleaner / Peon" required />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Phone</label>
            <input className="w-full rounded-md bg-slate-900 border border-slate-800 px-3 py-2 text-slate-100"
              value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Monthly Pay</label>
            <input className="w-full rounded-md bg-slate-900 border border-slate-800 px-3 py-2 text-slate-100"
              value={monthlyPay} onChange={(e) => setMonthlyPay(e.target.value)} placeholder="e.g. 25000" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Joining Date</label>
            <input type="date" className="w-full rounded-md bg-slate-900 border border-slate-800 px-3 py-2 text-slate-100"
              value={joiningDate} onChange={(e) => setJoiningDate(e.target.value)} />
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs text-slate-400 mb-1">Notes</label>
            <input className="w-full rounded-md bg-slate-900 border border-slate-800 px-3 py-2 text-slate-100"
              value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="optional" />
          </div>
        </div>

        <button type="submit" disabled={isPending}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60">
          {isPending ? 'Working…' : 'Add Staff Member'}
        </button>
      </form>

      <div className="rounded-xl border border-slate-800 bg-slate-950/30">
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-white font-semibold">Staff List</h2>
          <button onClick={() => startTransition(() => void load())} className="text-xs text-slate-300 hover:text-white" disabled={isPending}>
            Refresh
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-slate-400">
              <tr className="border-b border-slate-800">
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Designation</th>
                <th className="text-left px-4 py-3">Phone</th>
                <th className="text-left px-4 py-3">Monthly Pay</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="text-slate-200">
              {data.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-6 text-slate-400">No staff found.</td></tr>
              ) : (
                data.map((s) => (
                  <tr key={s.id} className="border-b border-slate-900/80">
                    <td className="px-4 py-3">{s.fullName}</td>
                    <td className="px-4 py-3">{s.designation}</td>
                    <td className="px-4 py-3 text-slate-300">{s.phoneNumber ?? '—'}</td>
                    <td className="px-4 py-3">{s.monthlyPay}</td>
                    <td className="px-4 py-3">{s.isActive ? 'ACTIVE' : 'INACTIVE'}</td>
                    <td className="px-4 py-3">
                      {s.isActive ? (
                        <button
                          className="text-xs text-rose-300 hover:text-rose-200"
                          onClick={() => {
                            if (!confirm('Deactivate this staff member?')) return;
                            startTransition(async () => {
                              const res = await deactivateStaffMemberAction(s.id);
                              if (!(res as any).success) setError((res as any).error || 'Failed');
                              await load();
                            });
                          }}
                        >
                          Deactivate
                        </button>
                      ) : (
                        <span className="text-xs text-slate-500">—</span>
                      )}
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
