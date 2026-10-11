'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import {
  AcademicClassItem,
  createClassAction,
  createSectionAction,
  deleteClassAction,
  deleteSectionAction,
  getAcademicClassesAction,
} from '@/actions/academic.actions';

export default function AcademicClassesPage() {
  const [classes, setClasses] = useState<AcademicClassItem[]>([]);
  const [currentSessionName, setCurrentSessionName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [className, setClassName] = useState('');
  const [numericOrder, setNumericOrder] = useState<number>(1);

  const [sectionNameByClass, setSectionNameByClass] = useState<Record<string, string>>({});
  const [sectionCapByClass, setSectionCapByClass] = useState<Record<string, number>>({});

  const classCount = useMemo(() => classes.length, [classes]);

  async function load() {
    setError(null);
    const res = await getAcademicClassesAction();

    if (!res.success) {
      setError(res.error || 'Failed to load classes');
      setClasses([]);
      setCurrentSessionName(null);
      return;
    }

    setClasses(res.classes);
    // success payload includes currentSession
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setCurrentSessionName((res as any).currentSession?.name ?? null);
  }

  useEffect(() => {
    startTransition(() => void load());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onCreateClass(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    startTransition(async () => {
      const res = await createClassAction({ name: className, numericOrder });
      if (!res.success) {
        setError(res.error || 'Failed to create class');
        return;
      }
      setInfo('Class created.');
      setClassName('');
      setNumericOrder((n) => n + 1);
      await load();
    });
  }

  function onAddSection(classId: string, e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    const name = (sectionNameByClass[classId] || '').trim();
    const capacity = sectionCapByClass[classId] ?? 40;

    startTransition(async () => {
      const res = await createSectionAction({ classId, name, capacity });
      if (!res.success) {
        setError(res.error || 'Failed to create section');
        return;
      }
      setInfo('Section added.');
      setSectionNameByClass((prev) => ({ ...prev, [classId]: '' }));
      setSectionCapByClass((prev) => ({ ...prev, [classId]: 40 }));
      await load();
    });
  }

  function onDeleteSection(sectionId: string) {
    if (!confirm('Delete this section?')) return;
    setError(null);
    setInfo(null);

    startTransition(async () => {
      const res = await deleteSectionAction({ id: sectionId });
      if (!res.success) {
        setError(res.error || 'Failed to delete section');
        return;
      }
      setInfo('Section deleted.');
      await load();
    });
  }

  function onDeleteClass(classId: string) {
    if (!confirm('Delete this class? This will also delete its sections & subjects (soft delete).')) return;
    setError(null);
    setInfo(null);

    startTransition(async () => {
      const res = await deleteClassAction({ id: classId });
      if (!res.success) {
        setError(res.error || 'Failed to delete class');
        return;
      }
      setInfo('Class deleted.');
      await load();
    });
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Classes & Sections</h1>
        <p className="text-slate-400 text-sm">
          {currentSessionName ? `Current session: ${currentSessionName} • Classes: ${classCount}` : 'Tip: Set a current academic session first from Academic Sessions.'}
        </p>
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

      <form onSubmit={onCreateClass} className="rounded-xl border border-slate-800 bg-slate-950/30 p-4 space-y-4">
        <h2 className="text-white font-semibold">Create Class</h2>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="md:col-span-2">
            <label className="block text-xs text-slate-400 mb-1">Class name</label>
            <input
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              placeholder="e.g. Grade 1"
              className="w-full rounded-md bg-slate-900 border border-slate-800 px-3 py-2 text-slate-100 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500/40"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Numeric order</label>
            <input
              type="number"
              min={1}
              value={numericOrder}
              onChange={(e) => setNumericOrder(Number(e.target.value))}
              className="w-full rounded-md bg-slate-900 border border-slate-800 px-3 py-2 text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/40"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
        >
          {isPending ? 'Working…' : 'Create'}
        </button>
      </form>

      <div className="space-y-4">
        {classes.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-6 text-slate-400">
            No classes found for current academic session.
          </div>
        ) : (
          classes.map((c) => (
            <div key={c.id} className="rounded-xl border border-slate-800 bg-slate-950/30">
              <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-white font-semibold">
                    {c.numericOrder}. {c.name}
                  </div>
                  <div className="text-xs text-slate-400">Sections: {c.sections.length}</div>
                </div>

                <button
                  onClick={() => onDeleteClass(c.id)}
                  disabled={isPending}
                  className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-200 hover:bg-rose-500/15 disabled:opacity-50"
                >
                  Delete class
                </button>
              </div>

              <div className="p-4 space-y-3">
                <form onSubmit={(e) => onAddSection(c.id, e)} className="grid gap-3 md:grid-cols-3 items-end">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Section name</label>
                    <input
                      value={sectionNameByClass[c.id] ?? ''}
                      onChange={(e) => setSectionNameByClass((prev) => ({ ...prev, [c.id]: e.target.value }))}
                      placeholder="e.g. A"
                      className="w-full rounded-md bg-slate-900 border border-slate-800 px-3 py-2 text-slate-100 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500/40"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Capacity</label>
                    <input
                      type="number"
                      min={1}
                      value={sectionCapByClass[c.id] ?? 40}
                      onChange={(e) => setSectionCapByClass((prev) => ({ ...prev, [c.id]: Number(e.target.value) }))}
                      className="w-full rounded-md bg-slate-900 border border-slate-800 px-3 py-2 text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/40"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isPending}
                    className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-100 hover:bg-slate-800 disabled:opacity-50"
                  >
                    Add section
                  </button>
                </form>

                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="text-slate-400">
                      <tr className="border-b border-slate-800">
                        <th className="text-left px-2 py-2">Section</th>
                        <th className="text-left px-2 py-2">Capacity</th>
                        <th className="text-right px-2 py-2">Action</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-200">
                      {c.sections.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-2 py-3 text-slate-400">
                            No sections yet.
                          </td>
                        </tr>
                      ) : (
                        c.sections.map((s) => (
                          <tr key={s.id} className="border-b border-slate-900/80">
                            <td className="px-2 py-2">{s.name}</td>
                            <td className="px-2 py-2">{s.capacity}</td>
                            <td className="px-2 py-2 text-right">
                              <button
                                onClick={() => onDeleteSection(s.id)}
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
          ))
        )}
      </div>
    </div>
  );
}
