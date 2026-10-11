'use client';

import React, { useState, useEffect } from 'react';
import { FileText, Printer, Eye, CheckCircle2 } from 'lucide-react';
import { getReportFilterOptionsAction } from '@/actions/report.actions';
import {
  getFeeReceiptDocumentAction,
  getStudentFeeStatementDocumentAction,
  getStudentResultCardDocumentAction,
  getAttendanceReportDocumentAction,
  getAdmissionFormDocumentAction,
  getStudentIdCardDocumentAction,
  getTeacherIdCardDocumentAction,
  getTimetableDocumentAction,
  getSchoolNoticeDocumentAction,
} from '@/actions/document.actions';

import { DocumentViewerModal } from '@/components/documents/DocumentViewerModal';
import { FeeReceiptDocument } from '@/components/documents/FeeReceiptDocument';
import { FeeStatementDocument } from '@/components/documents/FeeStatementDocument';
import { ResultCardDocument } from '@/components/documents/ResultCardDocument';
import { AttendanceReportDocument } from '@/components/documents/AttendanceReportDocument';
import { AdmissionFormDocument } from '@/components/documents/AdmissionFormDocument';
import { StudentIdCardDocument } from '@/components/documents/StudentIdCardDocument';
import { TeacherIdCardDocument } from '@/components/documents/TeacherIdCardDocument';
import { TimetableDocument } from '@/components/documents/TimetableDocument';
import { SchoolNoticeDocument } from '@/components/documents/SchoolNoticeDocument';

export type DocumentType =
  | 'FEE_RECEIPT'
  | 'FEE_STATEMENT'
  | 'RESULT_CARD'
  | 'ATTENDANCE_REPORT'
  | 'ADMISSION_FORM'
  | 'STUDENT_ID_CARD'
  | 'TEACHER_ID_CARD'
  | 'TIMETABLE'
  | 'NOTICE';

export default function DocumentsPage() {
  const [selectedDocType, setSelectedDocType] = useState<DocumentType>('FEE_RECEIPT');
  const [filterOptions, setFilterOptions] = useState<{
    students: { id: string; name: string }[];
    teachers: { id: string; name: string }[];
    sections: { id: string; name: string }[];
  }>({
    students: [],
    teachers: [],
    sections: [],
  });

  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [selectedId, setSelectedId] = useState('');

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [documentData, setDocumentData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    getReportFilterOptionsAction().then((res) => {
      if (res.success && res.filterOptions) {
        setFilterOptions({
          students: res.filterOptions.students || [],
          teachers: res.filterOptions.teachers || [],
          sections: res.filterOptions.sections || [],
        });
        if (res.filterOptions.students.length > 0) {
          setSelectedStudentId(res.filterOptions.students[0].id);
        }
        if (res.filterOptions.teachers.length > 0) {
          setSelectedTeacherId(res.filterOptions.teachers[0].id);
        }
        if (res.filterOptions.sections.length > 0) {
          setSelectedSectionId(res.filterOptions.sections[0].id);
        }
      }
    });
  }, []);

  const handleGenerateDocument = async () => {
    setIsLoading(true);
    let res: any = { success: false };

    switch (selectedDocType) {
      case 'FEE_RECEIPT':
        res = await getFeeReceiptDocumentAction(selectedId || 'receipt-sample');
        break;
      case 'FEE_STATEMENT':
        res = await getStudentFeeStatementDocumentAction(selectedStudentId);
        break;
      case 'RESULT_CARD':
        res = await getStudentResultCardDocumentAction(selectedId || 'exam-sample', selectedStudentId);
        break;
      case 'ATTENDANCE_REPORT':
        res = await getAttendanceReportDocumentAction({ studentId: selectedStudentId });
        break;
      case 'ADMISSION_FORM':
        res = await getAdmissionFormDocumentAction(selectedStudentId);
        break;
      case 'STUDENT_ID_CARD':
        res = await getStudentIdCardDocumentAction(selectedStudentId);
        break;
      case 'TEACHER_ID_CARD':
        res = await getTeacherIdCardDocumentAction(selectedTeacherId);
        break;
      case 'TIMETABLE':
        res = await getTimetableDocumentAction(selectedSectionId);
        break;
      case 'NOTICE':
        res = await getSchoolNoticeDocumentAction(selectedId || 'notice-sample');
        break;
    }

    if (res.success && res.data) {
      setDocumentData(res.data);
      setIsPreviewOpen(true);
    }
    setIsLoading(false);
  };

  const documentTypesList = [
    { type: 'FEE_RECEIPT', name: 'Official Fee Receipt', desc: 'Itemized payment receipt with invoice & remaining balance' },
    { type: 'FEE_STATEMENT', name: 'Student Fee Statement', desc: 'Comprehensive student fee ledger & payment history' },
    { type: 'RESULT_CARD', name: 'Student Examination Report Card', desc: 'Academic report card with marks, grades & teacher remarks' },
    { type: 'ATTENDANCE_REPORT', name: 'Official Attendance Report', desc: 'Date-range attendance history & percentage summary' },
    { type: 'ADMISSION_FORM', name: 'Student Admission Form', desc: 'Formal registration application with photo & guardian details' },
    { type: 'STUDENT_ID_CARD', name: 'Student Identity Card', desc: 'CR-80 standard double-sided student ID card' },
    { type: 'TEACHER_ID_CARD', name: 'Faculty Identity Card', desc: 'Official teacher ID card with employee ID & qualification' },
    { type: 'TIMETABLE', name: 'Class Timetable Schedule', desc: 'Weekly period schedule with assigned teachers & room numbers' },
    { type: 'NOTICE', name: 'General School Notice', desc: 'Official letterhead notice document for students & parents' },
  ];

  const renderDocumentComponent = () => {
    if (!documentData) return null;

    switch (selectedDocType) {
      case 'FEE_RECEIPT':
        return <FeeReceiptDocument data={documentData} />;
      case 'FEE_STATEMENT':
        return <FeeStatementDocument data={documentData} />;
      case 'RESULT_CARD':
        return <ResultCardDocument data={documentData} />;
      case 'ATTENDANCE_REPORT':
        return <AttendanceReportDocument data={documentData} />;
      case 'ADMISSION_FORM':
        return <AdmissionFormDocument data={documentData} />;
      case 'STUDENT_ID_CARD':
        return <StudentIdCardDocument data={documentData} />;
      case 'TEACHER_ID_CARD':
        return <TeacherIdCardDocument data={documentData} />;
      case 'TIMETABLE':
        return <TimetableDocument data={documentData} />;
      case 'NOTICE':
        return <SchoolNoticeDocument data={documentData} />;
      default:
        return null;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
          School Documents & PDF Generation Hub
        </h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Generate, preview, and print 9 official institutional document templates using real PostgreSQL records.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Selection List */}
        <div className="lg:col-span-1 space-y-3">
          <h3 className="font-semibold text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider px-1">
            Select Document Template
          </h3>

          <div className="space-y-2">
            {documentTypesList.map((doc) => {
              const isSelected = selectedDocType === doc.type;
              return (
                <button
                  key={doc.type}
                  onClick={() => setSelectedDocType(doc.type as DocumentType)}
                  className={`w-full text-left p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-600 text-indigo-900 dark:text-indigo-200 shadow-xs'
                      : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs">{doc.name}</span>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">{doc.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Configuration Form */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-xs sticky top-6">
            <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-3 mb-6">
              <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="font-bold text-base text-gray-900 dark:text-gray-100">
                Configure Document Parameters
              </h2>
            </div>

            <div className="space-y-4 mb-6">
              {/* Target Student Selector */}
              {['FEE_STATEMENT', 'RESULT_CARD', 'ATTENDANCE_REPORT', 'ADMISSION_FORM', 'STUDENT_ID_CARD'].includes(
                selectedDocType
              ) && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Select Target Student
                  </label>
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-xs text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500"
                  >
                    {filterOptions.students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Target Teacher Selector */}
              {selectedDocType === 'TEACHER_ID_CARD' && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Select Target Teacher / Faculty Member
                  </label>
                  <select
                    value={selectedTeacherId}
                    onChange={(e) => setSelectedTeacherId(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-xs text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500"
                  >
                    {filterOptions.teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Target Class Section Selector */}
              {selectedDocType === 'TIMETABLE' && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Select Class Section
                  </label>
                  <select
                    value={selectedSectionId}
                    onChange={(e) => setSelectedSectionId(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-xs text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500"
                  >
                    {filterOptions.sections.map((sec) => (
                      <option key={sec.id} value={sec.id}>
                        {sec.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Identifier override input if needed */}
              {['FEE_RECEIPT', 'RESULT_CARD', 'NOTICE'].includes(selectedDocType) && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Reference Record ID (Optional override)
                  </label>
                  <input
                    type="text"
                    placeholder="Enter Payment ID / Exam ID / Notice ID..."
                    value={selectedId}
                    onChange={(e) => setSelectedId(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleGenerateDocument}
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-semibold text-xs transition-colors shadow-md shadow-indigo-600/20 cursor-pointer"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <Eye className="w-4 h-4" />
                    <span>Generate & Preview Document</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Document Viewer Modal */}
      <DocumentViewerModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title={documentTypesList.find((d) => d.type === selectedDocType)?.name || 'Document Preview'}
      >
        {renderDocumentComponent()}
      </DocumentViewerModal>
    </div>
  );
}
