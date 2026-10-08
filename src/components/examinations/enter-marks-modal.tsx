'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { getExamMarksSheetAction, saveMarksAction } from '@/actions/exam.actions';
import { FileSpreadsheet, Loader2, Save, AlertCircle, CheckCircle2, Lock, X } from 'lucide-react';
import { getInitials, calculateGrade } from '@/lib/utils';

interface EnterMarksModalProps {
  isOpen: boolean;
  examSubjectId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function EnterMarksModal({
  isOpen,
  examSubjectId,
  onClose,
  onSuccess,
}: EnterMarksModalProps) {
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [sheetMeta, setSheetMeta] = useState<{
    examName: string;
    subjectName: string;
    className: string;
    maxMarks: number;
    passingMarks: number;
    isPublished: boolean;
  } | null>(null);

  const [marksState, setMarksState] = useState<
    Array<{
      studentId: string;
      fullName: string;
      admissionNo: string;
      rollNumber: string;
      sectionName: string;
      currentMarks: number;
      currentGrade: string;
      currentRemarks?: string;
    }>
  >([]);

  const [editedMarks, setEditedMarks] = useState<Record<string, number>>({});
  const [editedRemarks, setEditedRemarks] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen && examSubjectId) {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);

      getExamMarksSheetAction({ examSubjectId }).then((res) => {
        if (res.success && res.students) {
          setSheetMeta({
            examName: res.examName || '',
            subjectName: res.subjectName || '',
            className: res.className || '',
            maxMarks: res.maxMarks || 100,
            passingMarks: res.passingMarks || 40,
            isPublished: res.isPublished || false,
          });
          setMarksState(res.students);

          const initialMarks: Record<string, number> = {};
          const initialRemarks: Record<string, string> = {};
          res.students.forEach((s) => {
            initialMarks[s.studentId] = s.currentMarks;
            if (s.currentRemarks) initialRemarks[s.studentId] = s.currentRemarks;
          });
          setEditedMarks(initialMarks);
          setEditedRemarks(initialRemarks);
        } else {
          setError(res.error || 'Failed to load exam marks sheet');
        }
        setLoading(false);
      });
    }
  }, [isOpen, examSubjectId]);

  if (!isOpen || !examSubjectId) return null;

  const handleMarkChange = (studentId: string, value: number) => {
    const maxAllowed = sheetMeta?.maxMarks || 100;
    const clamped = Math.max(0, Math.min(maxAllowed, value));
    setEditedMarks((prev) => ({
      ...prev,
      [studentId]: clamped,
    }));
  };

  const handleSave = () => {
    if (!sheetMeta || marksState.length === 0) return;
    setError(null);
    setSuccessMessage(null);

    const records = marksState.map((s) => ({
      studentId: s.studentId,
      marksObtained: editedMarks[s.studentId] ?? 0,
      remarks: editedRemarks[s.studentId] || undefined,
    }));

    startTransition(async () => {
      const res = await saveMarksAction({
        examSubjectId,
        records,
      });

      if (res.success) {
        setSuccessMessage('Exam marks saved successfully & server grade calculations updated!');
        onSuccess();
      } else {
        setError(res.error || 'Failed to save exam marks');
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in-50">
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-indigo-500" />
              <span>Marks Entry: {sheetMeta?.subjectName} ({sheetMeta?.className})</span>
              {sheetMeta?.isPublished && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  <Lock className="w-3 h-3 text-amber-500" />
                  <span>Published (Locked)</span>
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Exam Session: <strong className="text-slate-700 dark:text-slate-300">{sheetMeta?.examName}</strong> | Max Marks: <strong className="text-indigo-600 dark:text-indigo-400 font-mono">{sheetMeta?.maxMarks}</strong> | Pass Threshold: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{sheetMeta?.passingMarks}</strong>
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
          <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-800 text-emerald-300 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Content Table */}
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            <p className="text-xs">Loading student roster and current marks...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-slate-100 dark:border-slate-800 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="pb-3">Roll No</th>
                  <th className="pb-3">Student Name</th>
                  <th className="pb-3">Section</th>
                  <th className="pb-3 text-center">Marks Obtained</th>
                  <th className="pb-3 text-center">Grade Preview</th>
                  <th className="pb-3 text-right">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                {marksState.map((s) => {
                  const currentScore = editedMarks[s.studentId] ?? 0;
                  const maxAllowed = sheetMeta?.maxMarks || 100;
                  const previewPercentage = maxAllowed > 0 ? (currentScore / maxAllowed) * 100 : 0;
                  const previewGrade = calculateGrade(previewPercentage);
                  const isPass = currentScore >= (sheetMeta?.passingMarks || 40);

                  return (
                    <tr key={s.studentId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 font-mono font-semibold text-slate-900 dark:text-white">
                        {s.rollNumber}
                      </td>

                      <td className="py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                            {getInitials(s.fullName)}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white">{s.fullName}</p>
                            <p className="text-[10px] text-slate-400">{s.admissionNo}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 text-slate-500 font-medium">{s.sectionName}</td>

                      {/* Marks Input Field */}
                      <td className="py-3 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <input
                            type="number"
                            min="0"
                            max={maxAllowed}
                            step="0.5"
                            value={currentScore}
                            disabled={sheetMeta?.isPublished}
                            onChange={(e) => handleMarkChange(s.studentId, parseFloat(e.target.value) || 0)}
                            className="w-20 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-center font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white disabled:opacity-50"
                          />
                          <span className="text-[10px] text-slate-400 font-mono">/ {maxAllowed}</span>
                        </div>
                      </td>

                      {/* Grade Preview Badge */}
                      <td className="py-3 text-center">
                        <span
                          className={`inline-flex items-center justify-center font-bold px-2.5 py-0.5 rounded-full text-xs font-mono ${
                            previewGrade === 'A+' || previewGrade === 'A'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : previewGrade === 'B' || previewGrade === 'C'
                              ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300'
                              : previewGrade === 'D'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                          }`}
                        >
                          {previewGrade}
                        </span>
                      </td>

                      <td className="py-3 text-right">
                        <input
                          type="text"
                          placeholder="Optional remarks"
                          value={editedRemarks[s.studentId] || ''}
                          disabled={sheetMeta?.isPublished}
                          onChange={(e) =>
                            setEditedRemarks((prev) => ({ ...prev, [s.studentId]: e.target.value }))
                          }
                          className="w-32 px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-right text-slate-700 dark:text-slate-300 disabled:opacity-50"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Save Button */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">
            Calculations strictly evaluated on server
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold transition-all"
            >
              Close
            </button>
            <button
              onClick={handleSave}
              disabled={isPending || Boolean(sheetMeta?.isPublished)}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/30 flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Marks...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Student Marks</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
