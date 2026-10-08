'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { studentFormSchema, StudentFormValues } from '@/schemas/student.schema';
import { createStudentAction, updateStudentAction, getClassOptionsAction } from '@/actions/student.actions';
import { Gender } from '@prisma/client';
import { Loader2, X, Plus, UserPlus, AlertCircle } from 'lucide-react';

interface StudentFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any;
}

export function StudentFormDialog({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}: StudentFormDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [classList, setClassList] = useState<Array<{ id: string; name: string; sections: Array<{ id: string; name: string }> }>>([]);

  const isEditing = Boolean(initialData);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<StudentFormValues>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
      fullName: initialData?.user?.fullName || '',
      email: initialData?.user?.email || '',
      phoneNumber: initialData?.user?.phoneNumber || '',
      admissionNo: initialData?.admissionNo || `ADM-${Date.now().toString().slice(-4)}`,
      rollNumber: initialData?.rollNumber || '',
      dateOfBirth: initialData?.dateOfBirth ? new Date(initialData.dateOfBirth).toISOString().split('T')[0] : '2009-01-01',
      gender: initialData?.gender || Gender.MALE,
      address: initialData?.address || '',
      classId: initialData?.enrollments?.[0]?.classId || '',
      sectionId: initialData?.enrollments?.[0]?.sectionId || '',
      guardianName: initialData?.parents?.[0]?.parent?.user?.fullName || '',
      guardianEmail: initialData?.parents?.[0]?.parent?.user?.email || '',
      guardianPhone: initialData?.parents?.[0]?.parent?.user?.phoneNumber || '',
      relationship: initialData?.parents?.[0]?.relationship || 'Father',
    },
  });

  const selectedClassId = watch('classId');
  const availableSections = classList.find((c) => c.id === selectedClassId)?.sections || [];

  useEffect(() => {
    if (isOpen) {
      getClassOptionsAction().then((res) => {
        if (res.success && res.classes) {
          setClassList(res.classes);
          if (res.classes.length > 0 && !selectedClassId) {
            setValue('classId', res.classes[0].id);
            if (res.classes[0].sections.length > 0) {
              setValue('sectionId', res.classes[0].sections[0].id);
            }
          }
        }
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const onSubmit = (values: StudentFormValues) => {
    setServerError(null);
    startTransition(async () => {
      let res;
      if (isEditing) {
        res = await updateStudentAction(initialData.id, values);
      } else {
        res = await createStudentAction(values);
      }

      if (res.success) {
        reset();
        onSuccess();
        onClose();
      } else {
        setServerError(res.error || 'An error occurred while saving student record');
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in-50">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-md">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {isEditing ? 'Edit Student Details' : 'Register New Student'}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {isEditing ? 'Update existing student profile' : 'Create a new student enrollment record'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="overflow-y-auto p-6 space-y-6 flex-1">
          {serverError && (
            <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{serverError}</span>
            </div>
          )}

          {/* 1. Student Personal Details */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 border-b border-slate-100 dark:border-slate-800 pb-1">
              Personal Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name *
                </label>
                <input
                  {...register('fullName')}
                  placeholder="e.g. Alexander Davis"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {errors.fullName && <p className="text-[11px] text-rose-500 mt-1">{errors.fullName.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address *
                </label>
                <input
                  {...register('email')}
                  type="email"
                  placeholder="student@school.com"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {errors.email && <p className="text-[11px] text-rose-500 mt-1">{errors.email.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Admission Number *
                </label>
                <input
                  {...register('admissionNo')}
                  placeholder="ADM-2025-089"
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {errors.admissionNo && <p className="text-[11px] text-rose-500 mt-1">{errors.admissionNo.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Roll Number
                </label>
                <input
                  {...register('rollNumber')}
                  placeholder="10-A-01"
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Date of Birth *
                </label>
                <input
                  {...register('dateOfBirth')}
                  type="date"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {errors.dateOfBirth && <p className="text-[11px] text-rose-500 mt-1">{errors.dateOfBirth.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Gender *
                </label>
                <select
                  {...register('gender')}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value={Gender.MALE}>Male</option>
                  <option value={Gender.FEMALE}>Female</option>
                  <option value={Gender.OTHER}>Other</option>
                </select>
                {errors.gender && <p className="text-[11px] text-rose-500 mt-1">{errors.gender.message}</p>}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Residential Address *
              </label>
              <textarea
                {...register('address')}
                rows={2}
                placeholder="Full residential street address..."
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {errors.address && <p className="text-[11px] text-rose-500 mt-1">{errors.address.message}</p>}
            </div>
          </div>

          {/* 2. Class & Section Enrollment */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 border-b border-slate-100 dark:border-slate-800 pb-1">
              Class Enrollment
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Class Grade *
                </label>
                <select
                  {...register('classId')}
                  onChange={(e) => {
                    setValue('classId', e.target.value);
                    const matchedClass = classList.find((c) => c.id === e.target.value);
                    if (matchedClass && matchedClass.sections.length > 0) {
                      setValue('sectionId', matchedClass.sections[0].id);
                    }
                  }}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {classList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {errors.classId && <p className="text-[11px] text-rose-500 mt-1">{errors.classId.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Section / Stream *
                </label>
                <select
                  {...register('sectionId')}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {availableSections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                {errors.sectionId && <p className="text-[11px] text-rose-500 mt-1">{errors.sectionId.message}</p>}
              </div>
            </div>
          </div>

          {/* 3. Guardian / Parent Information */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 border-b border-slate-100 dark:border-slate-800 pb-1">
              Guardian & Parent Contact
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Guardian Full Name *
                </label>
                <input
                  {...register('guardianName')}
                  placeholder="e.g. Robert Davis"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {errors.guardianName && <p className="text-[11px] text-rose-500 mt-1">{errors.guardianName.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Relationship *
                </label>
                <input
                  {...register('relationship')}
                  placeholder="Father / Mother / Guardian"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {errors.relationship && <p className="text-[11px] text-rose-500 mt-1">{errors.relationship.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Emergency Phone *
                </label>
                <input
                  {...register('guardianPhone')}
                  placeholder="+1 (555) 019-2834"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {errors.guardianPhone && <p className="text-[11px] text-rose-500 mt-1">{errors.guardianPhone.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Guardian Email
                </label>
                <input
                  {...register('guardianEmail')}
                  type="email"
                  placeholder="parent@school.com"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Footer Submit Buttons */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md shadow-indigo-600/30 transition-all disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Record...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>{isEditing ? 'Update Student' : 'Submit Admission'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
