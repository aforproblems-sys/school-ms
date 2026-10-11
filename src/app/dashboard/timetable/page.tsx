'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import {
  createTimetableEntryAction,
  deleteTimetableEntryAction,
  getTimetableEntriesAction,
  getTimetableOptionsAction,
  TimetableEntryItem,
  TimetableTeacherOption,
  TimetableSubjectOption,
  TimetableClassOption,
  TimetableSectionOption,
} from '@/actions/timetable.actions';

const DAYS: Array<{ id: number; label: string }> = [
  { id: 1, label: 'Mon' },
  { id: 2, label: 'Tue' },
  { id: 3, label: 'Wed' },
  { id: 4, label: 'Thu' },
  { id: 5, label: 'Fri' },
  { id: 6, label: 'Sat' },
  { id: 7, label: 'Sun' },
];

export default function TimetablePage() {
  const [classes, setClasses] = useState<TimetableClassOption[]>([]);
  const [sections, setSections] = useState<TimetableSectionOption[]>([]);
  const [teachers, setTeachers] = useState<TimetableTeacherOption[]>([]);
  const [subjects, setSubjects] = useState<TimetableSubjectOption[]>([]);

  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');

  const [entries, setEntries] = useState<TimetableEntryItem[]>([]);

  const [dayOfWeek, setDayOfWeek] = useState<number>(1);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('08:45');
  const [roomNo, setRoomNo] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [subjectId, setSubjectId] = useState<string>('');

  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const sectionsForClass = useMemo(
    () => sections.filter((s) => s.classId === selectedClassId),
    [sections, selectedClassId]
  );

  const subjectsForClass = useMemo(
    () => subjects.filter((s) => s.classId === selectedClassId),
    [subjects, selectedClassId]
  );

  const entriesByDay = useMemo(() => {
    const map = new Map<number, TimetableEntryItem[]>();
    for (const d of DAYS) map.set(d.id, []);
    for (const e of entries) {
      const arr = map.get(e.dayOfWeek) || [];
      arr.push(e);
      map.set(e.dayOfWeek, arr);
    }
    for (const arr of map.values()) arr.sort((a, b) => a.startTime.localeCompare(b.startTime));
    return map;
  }, [entries]);

  async function loadOptions() {
    setError(null);
    const res = await getTimetableOptionsAction();
    if (!res.success) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setError((res as any).error || 'Failed to load timetable options');
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setClasses((res as any).classes ?? []);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setSections((res as any).sections ?? []);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setSubjects((res as any).subjects ?? []);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setTeachers((res as any).teachers ?? []);

    // defaults
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const firstClassId = ((res as any).classes?.[0]?.id as string | undefined) ?? '';
    setSelectedClassId((prev) => prev || firstClassId);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const firstTeacherId = ((res as any).teachers?.[0]?.id as string | undefined) ?? '';
    setTeacherId((prev) => prev || firstTeacherId);
  }

  async function loadEntries(sectionId: string) {
    if (!sectionId) {
      setEntries([]);
      return;
    }
    setError(null);
    const res = await getTimetableEntriesAction({ sectionId });
    if (!res.success) {
      setError(res.error || 'Failed to load timetable');
      setEntries([]);
      return;
    }
    setEntries(res.entries);
  }

  useEffect(() => {
    startTransition(async () => {
      await loadOptions();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // auto-select first section when class changes
    const firstSection = sectionsForClass[0]?.id ?? '';
    setSelectedSectionId(firstSection);
    setSubjectId('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClassId]);

  useEffect(() => {
    startTransition(() => void loadEntries(selectedSectionId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSectionId]);

  function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    startTransition(async () => {
      const res = await createTimetableEntryAction({
        sectionId: selectedSectionId,
        teacherId,
        subjectId: subjectId || null,
        dayOfWeek,
        startTime,
        endTime,
        roomNo: roomNo || null,
      });

      if (!res.success) {
        setError(res.error || 'Failed to create period');
        return;
      }

      setInfo('Period added.');
      setRoomNo('');
      await loadEntries(selectedSectionId);
    });
  }

  function onDelete(id: string) {
    if (!confirm('Delete this timetable period?')) return;
    setError(null);
    setInfo(null);

    startTransition(async () => {
      const res = await deleteTimetableEntryAction({ id });
      if (!res.success) {
        setError(res.error || 'Failed to delete period');
        return;
      }
      setInfo('Period deleted.');
      await loadEntries(selectedSectionId);
    });
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Timetable</h1>
        <p className="text-slate-400 text-sm">Create timetable periods per section.</p>
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

      <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-4 space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Class</label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full rounded-md bg-slate-900 border border-slate-800 px-3 py-2 text-slate-100"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.numericOrder}. {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Section</label>
            <select
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value)}
              className="w-full rounded-md bg-slate-900 border border-slate-800 px-3 py-2 text-slate-100"
            >
              {sectionsForClass.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end justify-end">
            <button
              onClick={() => startTransition(() => void loadEntries(selectedSectionId))}
              className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-100 hover:bg-slate-800 disabled:opacity-50"
              disabled={isPending}
            >
              Refresh
            </button>
          </div>
        </div>

        <form onSubmit={onCreate} className="grid gap-3 md:grid-cols-6 items-end">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Day</label>
            <select
              value={dayOfWeek}
              onChange={(e) => setDayOfWeek(Number(e.target.value))}
              className="w-full rounded-md bg-slate-900 border border-slate-800 px-3 py-2 text-slate-100"
            >
              {DAYS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Start</label>
            <input
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              placeholder="08:00"
              className="w-full rounded-md bg-slate-900 border border-slate-800 px-3 py-2 text-slate-100"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">End</label>
            <input
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              placeholder="08:45"
              className="w-full rounded-md bg-slate-900 border border-slate-800 px-3 py-2 text-slate-100"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Teacher</label>
            <select
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
              className="w-full rounded-md bg-slate-900 border border-slate-800 px-3 py-2 text-slate-100"
              required
            >
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Subject (optional)</label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="w-full rounded-md bg-slate-900 border border-slate-800 px-3 py-2 text-slate-100"
            >
              <option value="">—</option>
              {subjectsForClass.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Room</label>
            <input
              value={roomNo}
              onChange={(e) => setRoomNo(e.target.value)}
              placeholder="e.g. 12"
              className="w-full rounded-md bg-slate-900 border border-slate-800 px-3 py-2 text-slate-100"
            />
          </div>

          <div className="md:col-span-6">
            <button
              type="submit"
              disabled={isPending || !selectedSectionId}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
            >
              {isPending ? 'Working…' : 'Add Period'}
            </button>
          </div>
        </form>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {DAYS.map((d) => (
          <div key={d.id} className="rounded-xl border border-slate-800 bg-slate-950/30">
            <div className="px-4 py-3 border-b border-slate-800 text-white font-semibold">{d.label}</div>
            <div className="p-4 space-y-2">
              {(entriesByDay.get(d.id) || []).length === 0 ? (
                <div className="text-slate-400 text-sm">No periods.</div>
              ) : (
                (entriesByDay.get(d.id) || []).map((e) => (
                  <div key={e.id} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2">
                    <div className="text-sm">
                      <div className="text-slate-100 font-medium">
                        {e.startTime} - {e.endTime} {e.roomNo ? `• Room ${e.roomNo}` : ''}
                      </div>
                      <div className="text-xs text-slate-400">
                        {e.teacherName}
                        {e.subjectLabel ? ` • ${e.subjectLabel}` : ''}
                      </div>
                    </div>
                    <button
                      onClick={() => onDelete(e.id)}
                      disabled={isPending}
                      className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-200 hover:bg-rose-500/15 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
