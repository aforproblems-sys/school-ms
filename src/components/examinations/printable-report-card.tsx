'use client';

import React, { useState, useEffect } from 'react';
import { getStudentReportCardAction } from '@/actions/exam.actions';
import { Printer, CheckCircle2, XCircle, Award, ShieldCheck, X, Loader2 } from 'lucide-react';

interface PrintableReportCardProps {
  isOpen: boolean;
  studentId: string | null;
  examId: string | null;
  onClose: () => void;
}

export function PrintableReportCard({
  isOpen,
  studentId,
  examId,
  onClose,
}: PrintableReportCardProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportCard, setReportCard] = useState<any | null>(null);

  useEffect(() => {
    if (isOpen && studentId && examId) {
      setLoading(true);
      setError(null);

      getStudentReportCardAction({ studentId, examId }).then((res) => {
        if (res.success && res.reportCard) {
          setReportCard(res.reportCard);
        } else {
          setError(res.error || 'Failed to load report card');
        }
        setLoading(false);
      });
    }
  }, [isOpen, studentId, examId]);

  if (!isOpen || !studentId || !examId) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in-50">
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Control Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 print:hidden">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Official Student Result Card</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Report Card</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            <p className="text-xs">Evaluating student report card & rank position...</p>
          </div>
        ) : error ? (
          <div className="py-8 text-center text-xs text-rose-500 font-semibold">{error}</div>
        ) : !reportCard ? null : (
          <div id="printable-report-card" className="space-y-6 text-slate-900 dark:text-white">
            {/* Header Branding */}
            <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white font-black text-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
                  SMS
                </div>
                <div>
                  <h2 className="text-lg font-extrabold tracking-tight">EduManage Academy</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Academic Progress Report Card</p>
                  <p className="text-[10px] text-slate-400 font-mono">Academic Session: {reportCard.sessionName}</p>
                </div>
              </div>

              <div className="text-right space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold shadow-sm bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800">
                  <Award className="w-3.5 h-3.5 text-indigo-500" />
                  <span>CLASS RANK: #{reportCard.summary.positionRank}</span>
                </div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">{reportCard.examName}</p>
              </div>
            </div>

            {/* Student Profile Info Banner */}
            <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Student Name</p>
                <p className="font-bold text-base text-slate-900 dark:text-white mt-0.5">{reportCard.student.fullName}</p>
                <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Admission No: <strong className="font-mono text-slate-800 dark:text-slate-200">{reportCard.student.admissionNo}</strong></p>
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Class & Section</p>
                <p className="font-bold text-sm text-slate-900 dark:text-white mt-0.5">{reportCard.student.className} ({reportCard.student.sectionName})</p>
                <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Roll Number: <strong className="font-mono text-slate-800 dark:text-slate-200">{reportCard.student.rollNumber}</strong></p>
              </div>
            </div>

            {/* Subject Breakdown Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-200 dark:border-slate-800 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="pb-2">Subject Name</th>
                    <th className="pb-2 text-center">Code</th>
                    <th className="pb-2 text-center">Max Marks</th>
                    <th className="pb-2 text-center">Pass Threshold</th>
                    <th className="pb-2 text-center">Marks Obtained</th>
                    <th className="pb-2 text-center">Grade</th>
                    <th className="pb-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-300">
                  {reportCard.subjectResults.map((sub: any) => (
                    <tr key={sub.subjectId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 font-semibold text-slate-900 dark:text-white">{sub.subjectName}</td>
                      <td className="py-3 text-center font-mono text-[11px] text-slate-400">{sub.subjectCode}</td>
                      <td className="py-3 text-center font-mono">{sub.maxMarks}</td>
                      <td className="py-3 text-center font-mono text-slate-400">{sub.passingMarks}</td>
                      <td className="py-3 text-center font-mono font-bold text-slate-900 dark:text-white">{sub.marksObtained}</td>
                      <td className="py-3 text-center font-mono font-extrabold text-indigo-600 dark:text-indigo-400">{sub.grade}</td>
                      <td className="py-3 text-right">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            sub.isPass
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                          }`}
                        >
                          {sub.isPass ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <XCircle className="w-3 h-3 text-rose-500" />}
                          <span>{sub.isPass ? 'PASS' : 'FAIL'}</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Overall Result Summary Box */}
            <div className="p-5 rounded-2xl bg-indigo-950/60 border border-indigo-800 text-indigo-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Overall Academic Result</p>
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-extrabold font-mono text-white">
                    {reportCard.summary.totalMarksObtained} / {reportCard.summary.totalMaxMarks}
                  </span>
                  <span className="text-xl font-bold text-emerald-400 font-mono">
                    ({reportCard.summary.overallPercentage}%)
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-[10px] text-indigo-300 uppercase font-semibold">Overall Grade</p>
                  <p className="text-2xl font-black font-mono text-indigo-300">{reportCard.summary.overallGrade}</p>
                </div>
                <div className="h-8 w-px bg-indigo-800" />
                <div className="text-right">
                  <p className="text-[10px] text-indigo-300 uppercase font-semibold">Final Status</p>
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-black px-3 py-1 rounded-full ${
                      reportCard.summary.resultStatus === 'PASS'
                        ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
                        : 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
                    }`}
                  >
                    {reportCard.summary.resultStatus}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer Signatures */}
            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Verified Official Report Card. No Signature Required.</span>
              </div>
              <p className="font-mono">Class Size: {reportCard.summary.totalClassStudents} Students Enrolled</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
