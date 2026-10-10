'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import {
  deletePayrollAction,
  getPayrollAction,
  PayrollItem,
  PayrollStaffOption,
  setPayrollPaidAction,
  upsertPayrollAction,
} from '@/actions/payroll.actions';

export default function PayrollPage() {
  const [staff, setStaff] = useState<PayrollStaffOption[]>([]);
  const [rows, setRows] = useState<PayrollItem[]>([]);
  const [currentSessionName, setCurrentSessionName] = useState<string | null>(null);

  const [filterMonth, setFilterMonth] = useState<string>('');
  const [filterYear, setFilterYear] = useState<string>('');

  const [staffUserId, setStaffUserId] = useState<string>('');
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [basicSalary, setBasicSalary] = useState<string>('');
  const [allowances, setAllowances] = useState<string>('0');
  const [deductions, setDeductions] = useState<string>('0');
  const [isPaid, setIsPaid] = useState<boolean>(false);
  const [paidDate, setPaidDate] = useState<string>(new Date().toISOString().slice(0, 10));

  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const visibleRows = useMemo(() => {
    let out = rows;
    const m = filterMonth ? Number(filterMonth) : null;
    const y = filterYear ? Number(filterYear) : null;
    if (m) out = out.filter((r) => r.month === m);
    if (y) out = out.filter((r) => r.year === y);
    return out;
  }, [rows, filterMonth, filterYear]);

  async function load() {
    setError(null);

    const res = await getPayrollAction({
      month: filterMonth ? Number(filterMonth) : null,
      year: filterYear ? Number(filterYear) : null,
    });

    if (!res.success) {
      setError(res.error || 'Failed to load payroll');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setStaff((res as any).staff ?? []);
      setRows([]);
      setCurrentSessionName(null);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setCurrentSessionName((res as any).currentSession?.name ?? null);
    setStaff(res.staff);
    setRows(res.payroll);

    const firstStaff = res.staff[0]?.id ?? '';
    setStaffUserId((prev) => prev || firstStaff);
  }

  useEffect(() => {
    startTransition(() => void load());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    startTransition(() => void load());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterMonth, filterYear]);

  function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    startTransition(async () => {
      const res = await upsertPayrollAction({
        staffUserId,
        month,
        year,
        basicSalary,
        allowances,
        deductions,
        isPaid,
        paidDate: isPaid ? paidDate : null,
      });

      if (!res.success) {
        setError(res.error || 'Failed to save payroll');
        return;
      }

      setInfo('Payroll saved.');
      setBasicSalary('');
      setAllowances('0');
      setDeductions('0');
      await load();
    });
  }

  function onTogglePaid(id: string, nextPaid: boolean) {
    setError(null);
    setInfo(null);

    startTransition(async () => {
      const res = await setPayrollPaidAction({ id, isPaid: nextPaid, paidDate });
      if (!res.success) {
        setError(res.error || 'Failed to update paid status');
        return;
      }
      setInfo('Payroll updated.');
      await load();
    });
  }

  function onDelete(id: string) {
    if (!confirm('Delete this payroll entry?')) return;

    setError(null);
    setInfo(null);

    startTransition(async () => {
      const res = await deletePayrollAction({ id });
      if (!res.success) {
        setError(res.error || 'Failed to delete payroll');
        return;
      }
      setInfo('Payroll deleted.');
      await load();
    });
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Payroll</h1>
        <p className="text-slate-400 text-sm">
          {currentSessionName
            ? `Current session: ${currentSessionName}`
            : 'Tip: set a current academic session first from Academic Sessions.'}
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

      <form onSubmit={onSave} className="rounded-xl border border-slate-800 bg-slate-950/30 p-4 space-y-4">
        <h2 className="text-white font-semibold">Create / Update Payroll</h2>

        <div className="grid gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <label className="block text-xs text-slate-400 mb-1">Staff</label>
            <select
              value={staffUserId}
              onChange={(e) => setStaffUserId(e.target.value)}
              className="w-full rounded-md bg-slate-900 border border-slate-800 px-3 py-2 text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/40"
              required
            >
              {staff.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName} ({u.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Month</label>
            <input
              type="number"
              min={1}
              max={12}
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="w-full rounded-md bg-slate-900 border border-slate-800 px-3 py-2 text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/40"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Year</label>
            <input
              type="number"
              min={2000}
              max={2100}
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-full rounded-md bg-slate-900 border border-slate-800 px-3 py-2 text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/40"
              required
            />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Basic</label>
            <input
              value={basicSalary}
              onChange={(e) => setBasicSalary(e.target.value)}
              inputMode="decimal"
              className="w-full rounded-md bg-slate-900 border border-slate-800 px-3 py-2 text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/40"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Allowances</label>
            <input
              value={allowances}
              onChange={(e) => setAllowances(e.target.value)}
              inputMode="decimal"
              className="w-full rounded-md bg-slate-900 border border-slate-800 px-3 py-2 text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/40"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Deductions</label>
            <input
              value={deductions}
              onChange={(e) => setDeductions(e.target.value)}
              inputMode="decimal"
              className="w-full rounded-md bg-slate-900 border border-slate-800 px-3 py-2 text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/40"
            />
          </div>

          <div className="flex items-end gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-200">
              <input type="checkbox" checked={isPaid} onChange={(e) => setIsPaid(e.target.checked)} />
              Paid
            </label>

            <input
              type="date"
              value={paidDate}
              onChange={(e) => setPaidDate(e.target.value)}
              className="rounded-md bg-slate-900 border border-slate-800 px-3 py-2 text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/40"
              disabled={!isPaid}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
        >
          {isPending ? 'Working…' : 'Save'}
        </button>

        <div className="text-xs text-slate-400">
          Filters:
          <input
            className="ml-2 w-16 rounded-md bg-slate-900 border border-slate-800 px-2 py-1 text-slate-100"
            placeholder="MM"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
          />
          <input
            className="ml-2 w-20 rounded-md bg-slate-900 border border-slate-800 px-2 py-1 text-slate-100"
            placeholder="YYYY"
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
          />
        </div>
      </form>

      <div className="rounded-xl border border-slate-800 bg-slate-950/30">
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-white font-semibold">Payroll Entries</h2>
          <button onClick={() => startTransition(() => void load())} className="text-xs text-slate-300 hover:text-white" disabled={isPending}>
            Refresh
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-slate-400">
              <tr className="border-b border-slate-800">
                <th className="text-left px-4 py-3">Staff</th>
                <th className="text-left px-4 py-3">Period</th>
                <th className="text-left px-4 py-3">Net</th>
                <th className="text-left px-4 py-3">Paid</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="text-slate-200">
              {visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-slate-400">No payroll entries.</td>
                </tr>
              ) : (
                visibleRows.map((r) => (
                  <tr key={r.id} className="border-b border-slate-900/80">
                    <td className="px-4 py-3">
                      <div className="font-medium">{r.staffName}</div>
                      <div className="text-xs text-slate-400">{r.staffEmail}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{r.month}/{r.year}</td>
                    <td className="px-4 py-3">{r.netSalary}</td>
                    <td className="px-4 py-3">
                      {r.isPaid ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-500/15 text-emerald-200 border border-emerald-500/30 px-2 py-0.5 text-xs">
                          Paid {r.paidDate ? `(${r.paidDate})` : ''}
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-slate-800 text-slate-200 border border-slate-700 px-2 py-0.5 text-xs">
                          Unpaid
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => onTogglePaid(r.id, !r.isPaid)}
                          disabled={isPending}
                          className="rounded-md border border-slate-700 px-3 py-1.5 text-xs hover:bg-slate-800 disabled:opacity-50"
                        >
                          {r.isPaid ? 'Mark unpaid' : 'Mark paid'}
                        </button>
                        <button
                          onClick={() => onDelete(r.id)}
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
