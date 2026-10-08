'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { assignExamSubjectAction, getExamsAction } from '@/actions/exam.actions';
import { AssignExamSubjectFormValues } from '@/schemas/exam.schema';
import { BookOpen, Loader2, Calendar, Award, X } from 'lucide-react';
import { getClassOptionsAction } from '@/actions/student.actions';

interface AssignSubjectDialogProps {
  isOpen: boolean;
  examId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function AssignSubjectDialog({
  isOpen,
  examId,
  onClose,
  onSuccess,
}: AssignSubjectDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [classList, setClassList] = useState<Array<{ id: string; name: string }>>([]);
  const [subjectList, setSubjectList] = useState<Array<{ id: string; name: string; code: string; className: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    examId: examId || '',
    subjectId: '',
    examDate: new Date().toISOString().split('T')[0],
    maxMarks: 100,
    passingMarks: 40,
  });

  useEffect(() => {
    if (examId) {
      setFormData((prev) => ({ ...prev, examId }));
    }
  }, [examId]);

  useEffect(() => {
    if (isOpen) {
      getClassOptionsAction().then((res) => {
        if (res.success && res.classes) {
          setClassList(res.classes);
        }
      });
      // Fetch subjects via client API or Server Action helper
      fetch('/api/subjects-list')
        .then((r) => r.json())
        .catch(() => {
          // Fallback if needed
        });
    }
  }, [isOpen]);

  if (!isOpen || !examId) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const res = await assignExamSubjectAction({
        examId,
        subjectId: formData.subjectId,
        examDate: formData.examDate,
        maxMarks: formData.maxMarks,
        passingMarks: formData.passingMarks,
      });

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.error || 'Failed to assign subject to exam');
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in-50">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-500" />
              <span>Assign Subject to Exam</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Set exam schedule, maximum marks allowed, and pass criteria.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs font-medium">
            {error}
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
              Subject ID / Code
            </label>
            <input
              type="text"
              required
              placeholder="Enter subject ID or code (e.g. MATH101)"
              value={formData.subjectId}
              onChange={(e) => setFormData((prev) => ({ ...prev, subjectId: e.target.value }))}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-medium"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
              Exam Schedule Date
            </label>
            <input
              type="date"
              required
              value={formData.examDate}
              onChange={(e) => setFormData((prev) => ({ ...prev, examDate: e.target.value }))}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
                Max Marks Total
              </label>
              <input
                type="number"
                required
                min="1"
                value={formData.maxMarks}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, maxMarks: parseFloat(e.target.value) || 100 }))
                }
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
                Passing Marks Threshold
              </label>
              <input
                type="number"
                required
                min="0"
                value={formData.passingMarks}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, passingMarks: parseFloat(e.target.value) || 40 }))
                }
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold text-emerald-600 dark:text-emerald-400"
              />
            </div>
          </div>

          {/* Footer Controls */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-md shadow-indigo-600/30 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Assign Subject</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
