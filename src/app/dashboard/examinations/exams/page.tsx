'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { getExamsAction, publishExamResultsAction } from '@/actions/exam.actions';
import { getClassOptionsAction, getStudentsAction } from '@/actions/student.actions';
import { CreateExamDialog } from '@/components/examinations/create-exam-dialog';
import { AssignSubjectDialog } from '@/components/examinations/assign-subject-dialog';
import { EnterMarksModal } from '@/components/examinations/enter-marks-modal';
import { PrintableReportCard } from '@/components/examinations/printable-report-card';
import { EmptyState } from '@/components/shared/empty-state';
import {
  FileSpreadsheet,
  PlusCircle,
  BookOpen,
  Award,
  CheckCircle2,
  Lock,
  Unlock,
  Printer,
  Calendar,
  Users,
  Loader2,
  Sparkles,
} from 'lucide-react';

export default function ExaminationsPage() {
  const [isPending, startTransition] = useTransition();
  const [exams, setExams] = useState<Array<any>>([]);
  const [students, setStudents] = useState<Array<{ id: string; user: { fullName: string }; admissionNo: string }>>([]);

  // Dialog Controls
  const [isCreateExamOpen, setIsCreateExamOpen] = useState(false);
  const [selectedExamIdForSubject, setSelectedExamIdForSubject] = useState<string | null>(null);
  const [selectedExamSubjectIdForMarks, setSelectedExamSubjectIdForMarks] = useState<string | null>(null);

  // Report Card Trigger State
  const [selectedReportCardStudentId, setSelectedReportCardStudentId] = useState<string>('');
  const [selectedReportCardExamId, setSelectedReportCardExamId] = useState<string>('');
  const [isReportCardOpen, setIsReportCardOpen] = useState(false);

  const fetchExams = () => {
    startTransition(async () => {
      const res = await getExamsAction();
      if (res.success && res.exams) {
        setExams(res.exams);
        if (res.exams.length > 0 && !selectedReportCardExamId) {
          setSelectedReportCardExamId(res.exams[0].id);
        }
      }
    });
  };

  useEffect(() => {
    fetchExams();
    getStudentsAction({ limit: 100 }).then((res) => {
      if (res.success && res.students) {
        setStudents(res.students as any);
        if (res.students.length > 0) {
          setSelectedReportCardStudentId(res.students[0].id);
        }
      }
    });
  }, []);

  const handleTogglePublish = (examId: string, currentStatus: boolean) => {
    startTransition(async () => {
      const res = await publishExamResultsAction(examId, !currentStatus);
      if (res.success) {
        fetchExams();
      }
    });
  };

  const publishedCount = exams.filter((e) => e.isPublished).length;
  const totalSubjects = exams.reduce((acc, e) => acc + e.subjectCount, 0);

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">
            <FileSpreadsheet className="w-4 h-4" />
            <span>Academic Performance Subsystem</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Examinations & Results Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
            Schedule exams, assign subjects, enter student marks, calculate server-side grades & rankings, publish results, and generate printable report cards.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsCreateExamOpen(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition-all"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>New Exam Session</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Scheduled Exams</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white">{exams.length}</p>
          <p className="text-[10px] text-slate-400 font-medium">Exam terms registered</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Published Results</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">{publishedCount}</p>
          <p className="text-[10px] text-slate-400 font-medium">Publicly accessible by students</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Assigned Subjects</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold font-mono text-indigo-600 dark:text-indigo-400">{totalSubjects}</p>
          <p className="text-[10px] text-slate-400 font-medium">Class subject examination papers</p>
        </div>
      </div>

      {/* Report Card Printing Shortcut Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-indigo-500" />
          <span className="text-xs font-bold text-slate-900 dark:text-white">Generate Student Report Card:</span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto flex-1 max-w-lg">
          <select
            value={selectedReportCardExamId}
            onChange={(e) => setSelectedReportCardExamId(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium flex-1"
          >
            {exams.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} ({e.isPublished ? 'Published' : 'Draft'})
              </option>
            ))}
          </select>

          <select
            value={selectedReportCardStudentId}
            onChange={(e) => setSelectedReportCardStudentId(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium flex-1"
          >
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.user.fullName} ({s.admissionNo})
              </option>
            ))}
          </select>

          <button
            onClick={() => setIsReportCardOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1 shadow-sm shrink-0"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Examinations List */}
      <div className="space-y-6">
        {isPending ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            <p className="text-xs">Loading examination records from database...</p>
          </div>
        ) : exams.length === 0 ? (
          <EmptyState
            icon={FileSpreadsheet}
            title="No Examinations Found"
            description="Click 'New Exam Session' to create an examination term."
          />
        ) : (
          exams.map((exam) => (
            <div
              key={exam.id}
              className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4"
            >
              {/* Exam Session Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">{exam.name}</h3>
                    {exam.isPublished ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                        <Lock className="w-3 h-3 text-emerald-500" />
                        <span>Published & Locked</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                        <Unlock className="w-3 h-3 text-slate-400" />
                        <span>Draft (Editable)</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                    Session: {exam.sessionName} | Dates: {new Date(exam.startDate).toLocaleDateString()} to {new Date(exam.endDate).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedExamIdForSubject(exam.id)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center gap-1 transition-all"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Assign Subject</span>
                  </button>

                  <button
                    onClick={() => handleTogglePublish(exam.id, exam.isPublished)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all ${
                      exam.isPublished
                        ? 'bg-amber-100 hover:bg-amber-200 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                    }`}
                  >
                    {exam.isPublished ? (
                      <>
                        <Unlock className="w-3.5 h-3.5" />
                        <span>Unlock Exam</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Publish Results</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Exam Subjects Grid / Table */}
              {exam.examSubjects.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400 font-medium">
                  No subjects assigned to this exam term yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-100 dark:border-slate-800 font-semibold uppercase tracking-wider text-[10px]">
                        <th className="pb-2">Subject Name</th>
                        <th className="pb-2">Class</th>
                        <th className="pb-2">Exam Date</th>
                        <th className="pb-2 text-center">Max / Pass</th>
                        <th className="pb-2 text-center">Marks Recorded</th>
                        <th className="pb-2 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                      {exam.examSubjects.map((es: any) => (
                        <tr key={es.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="py-2.5 font-semibold text-slate-900 dark:text-white">
                            {es.subjectName} <span className="text-[10px] text-slate-400 font-mono font-normal">({es.subjectCode})</span>
                          </td>
                          <td className="py-2.5 font-medium text-slate-500">{es.className}</td>
                          <td className="py-2.5 font-medium text-slate-500">
                            {new Date(es.examDate).toLocaleDateString()}
                          </td>
                          <td className="py-2.5 text-center font-mono font-bold">
                            <span className="text-slate-900 dark:text-white">{es.maxMarks}</span> / <span className="text-emerald-600 dark:text-emerald-400">{es.passingMarks}</span>
                          </td>
                          <td className="py-2.5 text-center font-mono text-slate-600 dark:text-slate-400">
                            {es.recordedResultsCount} students
                          </td>
                          <td className="py-2.5 text-right">
                            <button
                              onClick={() => setSelectedExamSubjectIdForMarks(es.id)}
                              className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-sm flex items-center gap-1 transition-all ml-auto"
                            >
                              <FileSpreadsheet className="w-3.5 h-3.5" />
                              <span>Enter / Edit Marks</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Dialog Modals */}
      <CreateExamDialog
        isOpen={isCreateExamOpen}
        onClose={() => setIsCreateExamOpen(false)}
        onSuccess={fetchExams}
      />

      <AssignSubjectDialog
        isOpen={Boolean(selectedExamIdForSubject)}
        examId={selectedExamIdForSubject}
        onClose={() => setSelectedExamIdForSubject(null)}
        onSuccess={fetchExams}
      />

      <EnterMarksModal
        isOpen={Boolean(selectedExamSubjectIdForMarks)}
        examSubjectId={selectedExamSubjectIdForMarks}
        onClose={() => setSelectedExamSubjectIdForMarks(null)}
        onSuccess={fetchExams}
      />

      <PrintableReportCard
        isOpen={isReportCardOpen}
        studentId={selectedReportCardStudentId}
        examId={selectedReportCardExamId}
        onClose={() => setIsReportCardOpen(false)}
      />
    </div>
  );
}
