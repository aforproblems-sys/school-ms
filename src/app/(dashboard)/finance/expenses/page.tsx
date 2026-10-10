'use client';

import { useEffect, useState, useTransition } from 'react';
import { createExpenseAction, deleteExpenseAction, getExpensesAction, ExpenseItem } from '@/actions/expense.actions';

export default function ExpensesPage() {
  const [items, setItems] = useState<ExpenseItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [category, setCategory] = useState('Utilities');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [receiptUrl, setReceiptUrl] = useState('');

  async function load() {
    setError(null);
    const res = await getExpensesAction();
    if (!res.success) {
      setError(res.error || 'Failed to load expenses');
      setItems([]);
      return;
    }
    setItems(res.expenses);
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
      const res = await createExpenseAction({
        category,
        title,
        amount,
        expenseDate,
        receiptUrl: receiptUrl || null,
      });

      if (!res.success) {
        setError(res.error || 'Failed to create expense');
        return;
      }

      setInfo('Expense recorded.');
      setTitle('');
      setAmount('');
      setReceiptUrl('');
      await load();
    });
  }

  function onDelete(id: string) {
    if (!confirm('Delete this expense?')) return;

    setError(null);
    setInfo(null);

    startTransition(async () => {
      const res = await deleteExpenseAction({ id });
      if (!res.success) {
        setError(res.error || 'Failed to delete expense');
        return;
      }
      setInfo('Expense deleted.');
      await load();
    });
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Expenses</h1>
        <p className="text-slate-400 text-sm">Record and review school expenses.</p>
      </div>

      {(error || info) && (
        <div
          className={[
            'rounded-lg border px-4 py-3 text-sm',
            error ? 'border-rose-500/40 bg-rose-500/10 text-rose-200' : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
          ].join(' ')}
        >
          {error ?? info}
        </div>
      )}

      <form onSubmit={onCreate} className="rounded-xl border border-slate-800 bg-slate-950/30 p-4 space-y-4">
        <h2 className="text-white font-semibold">Add Expense</h2>

        <div className="grid gap-3 md:grid-cols-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Category</label>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-md bg-slate-900 border border-slate-800 px-3 py-2 text-slate-100 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500/40"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs text-slate-400 mb-1">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Generator maintenance"
              className="w-full rounded-md bg-slate-900 border border-slate-800 px-3 py-2 text-slate-100 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500/40"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Amount</label>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 2500"
              inputMode="decimal"
              className="w-full rounded-md bg-slate-900 border border-slate-800 px-3 py-2 text-slate-100 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500/40"
              required
            />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4 items-end">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Expense date</label>
            <input
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              className="w-full rounded-md bg-slate-900 border border-slate-800 px-3 py-2 text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/40"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs text-slate-400 mb-1">Receipt URL (optional)</label>
            <input
              value={receiptUrl}
              onChange={(e) => setReceiptUrl(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-md bg-slate-900 border border-slate-800 px-3 py-2 text-slate-100 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500/40"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            {isPending ? 'Working…' : 'Save'}
          </button>
        </div>
      </form>

      <div className="rounded-xl border border-slate-800 bg-slate-950/30">
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-white font-semibold">Recent Expenses</h2>
          <button onClick={() => startTransition(() => void load())} className="text-xs text-slate-300 hover:text-white" disabled={isPending}>
            Refresh
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-slate-400">
              <tr className="border-b border-slate-800">
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-left px-4 py-3">Category</th>
                <th className="text-left px-4 py-3">Title</th>
                <th className="text-left px-4 py-3">Amount</th>
                <th className="text-right px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="text-slate-200">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-slate-400">
                    No expenses recorded yet.
                  </td>
                </tr>
              ) : (
                items.map((x) => (
                  <tr key={x.id} className="border-b border-slate-900/80">
                    <td className="px-4 py-3 text-slate-300">{x.expenseDate}</td>
                    <td className="px-4 py-3">{x.category}</td>
                    <td className="px-4 py-3 font-medium">{x.title}</td>
                    <td className="px-4 py-3">{`PKR ${x.amount}`}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => onDelete(x.id)}
                        disabled={isPending}
                        className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-200 hover:bg-rose-500/15 disabled:opacity-50"
                      >
                        Delete
                      </button>
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
