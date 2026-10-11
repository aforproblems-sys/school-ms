'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import {
  createHomeworkAction,
  deleteHomeworkAction,
  getHomeworkAction,
  HomeworkItem,
  SubjectOption,
  TeacherOption,
} from '@/actions/homework.actions';

export default function HomeworkPage() {
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [items, setItems] = useState<HomeworkItem[]>([]);
  const [currentSessionName, setCurrentSessionName] = useState<string | null>(null);

  const [subjectId, setSubjectId] = useState<string>('');
  const [teacherId, setTeacherId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [attachmentUrl, setAttachmentUrl] = useState('');

  const [filterSubjectId, setFilterSubjectId] = useState<string>('');

  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const visible = useMemo(() => {
    if (!filterSubjectId) return items;
    return items.filter((x) => x.subjectId === filterSubjectId);
  }, [items, filterSubjectId]);

  async function load() {
    setError(null);
    const res = await getHomeworkAction();

    if (!res.success) {
      setError(res.error || 'Failed to load homework');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setTeachers((res as any).teachers ?? []);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setSubjects((res as any).subjects ?? []);
      setItems([]);
      setCurrentSessionName(null);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setCurrentSessionName((res as any).currentSession?.name ?? null);
    setTeachers(res.teachers);
    setSubjects(res.subjects);
    setItems(res.homeworks);

    const firstSubject = res.subjects[0]?.id ?? '';
    const firstTeacher = res.teachers[0]?.id ?? '';

    setSubjectId((prev) => prev || firstSubject);
    setTeacherId((prev) => prev || firstTeacher);
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
      const res = await createHomeworkAction({
        subjectId,
        teacherId: teacherId || null,
        title,
        description,
        dueDate,
        attachmentUrl: attachmentUrl || null,
      });

      if (!res.success) {
        setError(res.error || 'Failed to create homework');
        return;
      }

      setInfo('Homework created.');
      setTitle('');
      setDescription('');
      setAttachmentUrl('');
      await load();
    });
  }

  function onDelete(id: string) {
    if (!confirm('Delete this homework?')) return;
    setError(null);
    setInfo(null);

    startTransition(async () => {
      const res = await deleteHomeworkAction({ id });
      if (!res.success) {
        setError(res.error || 'Failed to delete homework');
        return;
      }
      setInfo('Homework deleted.');
      await load();
    });
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Homework</h1>
        <p className="text-slate-400 text-sm">
          {currentSessionName ? `Current session: ${currentSessionName}` : 'Tip: set current academic session first.'}
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
        <h2 className="text-white font-semibold">Create Homework</h2>

        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Subject</label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="w-full rounded-md bg-slate-900 border border-slate-800 px-3 py-2 text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/40"
              required
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.classNumericOrder}. {s.className} — {s.code}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Teacher</label>
            <select
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
              className="w-full rounded-md bg-slate-900 border border-slate-800 px-3 py-2 text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/40"
            >
              <option value="">Auto (current teacher)</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.email})
                </option>
              ))}
            </select>
            <div className="text-[11px] text-slate-500 mt-1">Teachers can leave this as Auto.</div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Due date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-md bg-slate-900 border border-slate-800 px-3 py-2 text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/40"
              required
            />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="md:col-span-1">
            <label className="block text-xs text-slate-400 mb-1">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Chapter 3 questions"
              className="w-full rounded-md bg-slate-900 border border-slate-800 px-3 py-2 text-slate-100 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500/40"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs text-slate-400 mb-1">Attachment URL (optional)</label>
            <input
              value={attachmentUrl}
              onChange={(e) => setAttachmentUrl(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-md bg-slate-900 border border-slate-800 px-3 py-2 text-slate-100 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500/40"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full rounded-md bg-slate-900 border border-slate-800 px-3 py-2 text-slate-100 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500/40"
            required
          />
        </div>

        <div className="flex items-center justify-between">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            {isPending ? 'Working…' : 'Create'}
          </button>

          <div className="text-xs text-slate-400">
            Filter:
            <select
              value={filterSubjectId}
              onChange={(e) => setFilterSubjectId(e.target.value)}
              className="ml-2 rounded-md bg-slate-900 border border-slate-800 px-2 py-1 text-slate-100"
            >
              <option value="">All subjects</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code}
                </option>
              ))}
            </select>
          </div>
        </div>
      </form>

      <div className="rounded-xl border border-slate-800 bg-slate-950/30">
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-white font-semibold">Homework List</h2>
          <button onClick={() => startTransition(() => void load())} className="text-xs text-slate-300 hover:text-white" disabled={isPending}>
            Refresh
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-slate-400">
              <tr className="border-b border-slate-800">
                <th className="text-left px-4 py-3">Due</th>
                <th className="text-left px-4 py-3">Class</th>
                <th className="text-left px-4 py-3">Subject</th>
                <th className="text-left px-4 py-3">Title</th>
                <th className="text-left px-4 py-3">Teacher</th>
                <th className="text-right px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="text-slate-200">
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-slate-400">No homework created yet.</td>
                </tr>
              ) : (
                visible.map((h) => (
                  <tr key={h.id} className="border-b border-slate-900/80">
                    <td className="px-4 py-3 text-slate-300">{h.dueDate}</td>
                    <td className="px-4 py-3 text-slate-300">{h.className}</td>
                    <td className="px-4 py-3">{h.subjectName}</td>
                    <td className="px-4 py-3 font-medium">{h.title}</td>
                    <td className="px-4 py-3">{h.teacherName}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => onDelete(h.id)}
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
