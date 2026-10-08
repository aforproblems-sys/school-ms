'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { assignFeeStructureAction, getFeeStructuresAction } from '@/actions/fee.actions';
import { getClassOptionsAction, getStudentsAction } from '@/actions/student.actions';
import { AssignFeeFormValues } from '@/schemas/fee.schema';
import { Send, Loader2, Users, DollarSign, Percent, AlertTriangle, X } from 'lucide-react';

interface AssignFeeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AssignFeeDialog({ isOpen, onClose, onSuccess }: AssignFeeDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [feeStructures, setFeeStructures] = useState<Array<{ id: string; name: string; amount: any; class: { name: string } }>>([]);
  const [classList, setClassList] = useState<Array<{ id: string; name: string }>>([]);
  const [students, setStudents] = useState<Array<{ id: string; user: { fullName: string }; admissionNo: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<AssignFeeFormValues>({
    feeStructureId: '',
    assignmentType: 'CLASS',
    classId: '',
    studentId: '',
    discountAmount: 0,
    lateFeeAmount: 0,
    dueDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (isOpen) {
      Promise.all([getFeeStructuresAction(), getClassOptionsAction(), getStudentsAction({ limit: 100 })]).then(
        ([structuresRes, classRes, studentsRes]) => {
          if (structuresRes.success && structuresRes.structures) {
            setFeeStructures(structuresRes.structures);
            if (structuresRes.structures.length > 0) {
              setFormData((prev) => ({ ...prev, feeStructureId: structuresRes.structures[0].id }));
            }
          }
          if (classRes.success && classRes.classes) {
            setClassList(classRes.classes);
            if (classRes.classes.length > 0) {
              setFormData((prev) => ({ ...prev, classId: classRes.classes[0].id }));
            }
          }
          if (studentsRes.success && studentsRes.students) {
            setStudents(studentsRes.students as any);
            if (studentsRes.students.length > 0) {
              setFormData((prev) => ({ ...prev, studentId: studentsRes.students[0].id }));
            }
          }
        }
      );
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedStructure = feeStructures.find((s) => s.id === formData.feeStructureId);
  const baseAmount = selectedStructure ? Number(selectedStructure.amount) : 0;
  const netCalculatedAmount = Math.max(0, baseAmount - formData.discountAmount + formData.lateFeeAmount);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const res = await assignFeeStructureAction(formData);
      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.error || 'Failed to assign fee invoices');
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in-50">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Send className="w-4 h-4 text-emerald-500" />
              <span>Assign Fee Invoice</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Issue fee bills to a whole class grade or specific student with discounts & late fee options.
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
          {/* Target Selector */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, assignmentType: 'CLASS' }))}
              className={`py-2 rounded-lg font-semibold transition-all ${
                formData.assignmentType === 'CLASS'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Class Grade Batch
            </button>
            <button
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, assignmentType: 'STUDENT' }))}
              className={`py-2 rounded-lg font-semibold transition-all ${
                formData.assignmentType === 'STUDENT'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Individual Student
            </button>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
              Select Fee Structure
            </label>
            <select
              value={formData.feeStructureId}
              onChange={(e) => setFormData((prev) => ({ ...prev, feeStructureId: e.target.value }))}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            >
              {feeStructures.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} - ${Number(s.amount).toFixed(2)} ({s.class.name})
                </option>
              ))}
            </select>
          </div>

          {formData.assignmentType === 'CLASS' ? (
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
                Target Class Grade
              </label>
              <select
                value={formData.classId}
                onChange={(e) => setFormData((prev) => ({ ...prev, classId: e.target.value }))}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              >
                {classList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
                Target Student
              </label>
              <select
                value={formData.studentId}
                onChange={(e) => setFormData((prev) => ({ ...prev, studentId: e.target.value }))}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.user.fullName} ({s.admissionNo})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Adjustments: Discount & Late Fee */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
                Discount Concession ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.discountAmount}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, discountAmount: parseFloat(e.target.value) || 0 }))
                }
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-semibold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
                Late Fee Surcharge ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.lateFeeAmount}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, lateFeeAmount: parseFloat(e.target.value) || 0 }))
                }
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-semibold"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
              Invoice Due Date
            </label>
            <input
              type="date"
              required
              value={formData.dueDate}
              onChange={(e) => setFormData((prev) => ({ ...prev, dueDate: e.target.value }))}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            />
          </div>

          {/* Server Net Calculation Banner */}
          <div className="p-3.5 rounded-xl bg-indigo-950/60 border border-indigo-800 flex items-center justify-between text-indigo-200">
            <div>
              <p className="text-[10px] text-indigo-400 font-semibold uppercase">Net Invoiced Total</p>
              <p className="text-xs text-indigo-300">Base ${baseAmount.toFixed(2)} - Disc ${formData.discountAmount.toFixed(2)} + Surcharge ${formData.lateFeeAmount.toFixed(2)}</p>
            </div>
            <span className="text-lg font-extrabold font-mono text-emerald-400">
              ${netCalculatedAmount.toFixed(2)}
            </span>
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
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-md shadow-emerald-600/30 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Generate Invoices</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
