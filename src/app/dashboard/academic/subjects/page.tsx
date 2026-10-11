'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import {
  createSubjectAction,
  deleteSubjectAction,
  getAcademicSubjectsAction,
  SubjectItem,
} from '@/actions/academic.actions';

type ClassOption = { id: string; name: string; numericOrder: number };

export default function AcademicSubjectsPage() {
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [currentSessionName, setCurrentSessionName] = useState<string | null>(null);

  const [filterClassId, setFilterClassId] = useState<string>('');

  const [classId, setClassId] = useState<string>('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState<string>('THEORY');

  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredSubjects = useMemo(() => {
    if (!filterClassId) return subjects;
    return subjects.filter((s) => s.classId === filterClassId);
  }, [subjects, filterClassId]);

  async function load() {
    setError(null);
    const res = await getAcademicSubjectsAction({ classId: filterClassId || null });

    if (!res.success) {
      setError(res.error || 'Failed to load subjects');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setClasses((res as any).classes ?? []);
      setSubjects([]);
      setCurrentSessionName(null);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setCurrentSessionName((res as any).currentSession?.name ?? null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setClasses((res as any).classes ?? []);
    setSubjects(res.subjects);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const firstClassId = ((res as any).classes?.[0]?.id as string | undefined) ?? '';
    setClassId((prev) => prev || firstClassId);
  }

  useEffect(() => {
    startTransition(() => void load());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    startTransition(() => void load());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterClassId]);

  function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    startTransition(async () => {
      const res = await createSubjectAction({ classId, name, code, type });
      if (!res.success) {
        setError(res.error || 'Failed to create subject');
        return;
      }
      setInfo('Subject created.');
      setName('');
      setCode('');
      await load();
    });
  }

  function onDelete(id: string) {
    if (!confirm('Delete this subject?')) return;

    setError(null);
    setInfo(null);

    startTransition(async () => {
      const res = await deleteSubjectAction({ id });
      if (!res.success) {
        setError(res.error || 'Failed to delete subject');
        return;
      }
      setInfo('Subject deleted.');
      await load();
    });
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Subjects</h1>
        <p className="text-slate-400 text-sm">
          {currentSessionName ? `Current session: ${currentSessionName}` : 'Tip: set a current academic session first.'}
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

      <form onSubmit={onCreate} className="rounded-xl border border-slate-800 bg-slate-950/30 p-4 space-y-4">
        <h2 className="text-white font-semibold">Create Subject</h2>

        <div className="grid gap-3 md:grid-cols-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Class</label>
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="w-full rounded-md bg-slate-900 border border-slate-800 px-3 py-2 text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/40"
              required
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.numericOrder}. {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Code</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. MATH101"
              className="w-full rounded-md bg-slate-900 border border-slate-800 px-3 py-2 text-slate-100 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500/40"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs text-slate-400 mb-1">Subject name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Mathematics"
              className="w-full rounded-md bg-slate-900 border border-slate-800 px-3 py-2 text-slate-100 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500/40"
              required
            />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4 items-end">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded-md bg-slate-900 border border-slate-800 px-3 py-2 text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/40"
            >
              <option value="THEORY">THEORY</option>
              <option value="PRACTICAL">PRACTICAL</option>
              <option value="LAB">LAB</option>
            </select>
          </div>

          <div className="md:col-span-3 flex items-center justify-between">
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
            >
              {isPending ? 'Working…' : 'Create'}
            </button>

            <div className="text-xs text-slate-400">
              Filter:
              <select
                value={filterClassId}
                onChange={(e) => setFilterClassId(e.target.value)}
                className="ml-2 rounded-md bg-slate-900 border border-slate-800 px-2 py-1 text-slate-100"
              >
                <option value="">All classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.numericOrder}. {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </form>

      <div className="rounded-xl border border-slate-800 bg-slate-950/30">
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-white font-semibold">Subjects</h2>
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
                <th className="text-left px-4 py-3">Class</th>
                <th className="text-left px-4 py-3">Code</th>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-right px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="text-slate-200">
              {filteredSubjects.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-slate-400">
                    No subjects found.
                  </td>
                </tr>
              ) : (
                filteredSubjects.map((s) => (
                  <tr key={s.id} className="border-b border-slate-900/80">
                    <td className="px-4 py-3 text-slate-300">
                      {s.classNumericOrder}. {s.className}
                    </td>
                    <td className="px-4 py-3 font-mono">{s.code}</td>
                    <td className="px-4 py-3 font-medium">{s.name}</td>
                    <td className="px-4 py-3">{s.type}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => onDelete(s.id)}
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
