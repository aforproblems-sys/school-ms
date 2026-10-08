'use client';

import React, { useTransition, useState } from 'react';
import { deleteStudentAction } from '@/actions/student.actions';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface DeleteStudentDialogProps {
  isOpen: boolean;
  studentId: string | null;
  studentName: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function DeleteStudentDialog({
  isOpen,
  studentId,
  studentName,
  onClose,
  onSuccess,
}: DeleteStudentDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !studentId) return null;

  const handleDelete = () => {
    setErrorMsg(null);
    startTransition(async () => {
      const res = await deleteStudentAction(studentId);
      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setErrorMsg(res.error || 'Failed to delete student');
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in-50">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Archive Student Record</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Soft delete & deactivate user account</p>
          </div>
        </div>

        {errorMsg && (
          <p className="text-xs text-rose-500 bg-rose-50 dark:bg-rose-950/40 p-3 rounded-xl border border-rose-200 dark:border-rose-900">
            {errorMsg}
          </p>
        )}

        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          Are you sure you want to archive student <span className="font-semibold text-slate-900 dark:text-white">{studentName}</span>? Their account will be deactivated and removed from active class lists.
        </p>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-md transition-all disabled:opacity-50"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Archiving...</span>
              </>
            ) : (
              <span>Confirm Archive</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
