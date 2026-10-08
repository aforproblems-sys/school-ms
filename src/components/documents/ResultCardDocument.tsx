'use client';

import React from 'react';
import { DocumentLayout } from './DocumentLayout';
import { SchoolLetterhead } from './SchoolLetterhead';
import { DocumentSignatureBlock } from './DocumentSignatureBlock';
import { SchoolBrandingData } from '@/actions/document.actions';

export interface ResultCardSubjectItem {
  subjectName: string;
  subjectCode: string;
  maxMarks: number;
  passingMarks: number;
  obtainedMarks: number;
  grade: string;
  status: string;
}

export interface ResultCardData {
  school: SchoolBrandingData;
  examName: string;
  sessionName: string;
  studentName: string;
  admissionNo: string;
  rollNumber: string;
  className: string;
  sectionName: string;
  totalMaxMarks: number;
  totalObtainedMarks: number;
  percentage: number;
  grade: string;
  status: string;
  classPosition: string;
  teacherRemarks: string;
  subjects: ResultCardSubjectItem[];
}

export function ResultCardDocument({ data }: { data: ResultCardData }) {
  return (
    <DocumentLayout>
      <SchoolLetterhead school={data.school} documentTitle="Official Examination Report Card" documentSubTitle={`${data.examName} (${data.sessionName})`} />

      {/* Student Profile Info */}
      <div className="bg-gray-50 p-4 rounded-xl text-xs grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 border border-gray-200">
        <div>
          <p className="text-gray-500 font-medium">Student Name</p>
          <p className="font-bold text-gray-900 text-sm">{data.studentName}</p>
        </div>
        <div>
          <p className="text-gray-500 font-medium">Admission Number</p>
          <p className="font-semibold text-gray-900">{data.admissionNo}</p>
        </div>
        <div>
          <p className="text-gray-500 font-medium">Class & Section</p>
          <p className="font-semibold text-gray-900">{data.className} ({data.sectionName})</p>
        </div>
        <div>
          <p className="text-gray-500 font-medium">Class Rank Position</p>
          <p className="font-bold text-indigo-600 text-sm">{data.classPosition}</p>
        </div>
      </div>

      {/* Subject Marks Table */}
      <table className="w-full text-left text-xs mb-6 border-collapse border border-gray-300">
        <thead className="bg-gray-100 font-semibold text-gray-800">
          <tr>
            <th className="p-2.5 border border-gray-300">Subject Code</th>
            <th className="p-2.5 border border-gray-300">Subject Title</th>
            <th className="p-2.5 border border-gray-300 text-right">Max Marks</th>
            <th className="p-2.5 border border-gray-300 text-right">Pass Marks</th>
            <th className="p-2.5 border border-gray-300 text-right">Obtained Marks</th>
            <th className="p-2.5 border border-gray-300 text-center">Grade</th>
            <th className="p-2.5 border border-gray-300 text-center">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {data.subjects.map((sub, idx) => (
            <tr key={idx}>
              <td className="p-2.5 border border-gray-300 font-mono text-[11px] text-gray-600">{sub.subjectCode}</td>
              <td className="p-2.5 border border-gray-300 font-medium">{sub.subjectName}</td>
              <td className="p-2.5 border border-gray-300 text-right">{sub.maxMarks}</td>
              <td className="p-2.5 border border-gray-300 text-right text-gray-500">{sub.passingMarks}</td>
              <td className="p-2.5 border border-gray-300 text-right font-bold text-gray-900">{sub.obtainedMarks}</td>
              <td className="p-2.5 border border-gray-300 text-center font-bold text-indigo-600">{sub.grade}</td>
              <td className="p-2.5 border border-gray-300 text-center">
                <span
                  className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                    sub.status === 'PASS' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {sub.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Aggregate Score Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-gray-900 text-white p-4 rounded-xl text-center mb-6">
        <div>
          <p className="text-[10px] text-gray-400 font-medium">TOTAL MARKS</p>
          <p className="text-lg font-bold">{data.totalObtainedMarks} / {data.totalMaxMarks}</p>
        </div>
        <div>
          <p className="text-[10px] text-gray-400 font-medium">PERCENTAGE</p>
          <p className="text-lg font-bold">{data.percentage}%</p>
        </div>
        <div>
          <p className="text-[10px] text-gray-400 font-medium">OVERALL GRADE</p>
          <p className="text-lg font-bold text-indigo-400">{data.grade}</p>
        </div>
        <div>
          <p className="text-[10px] text-gray-400 font-medium">FINAL RESULT</p>
          <p className={`text-lg font-bold ${data.status === 'PASS' ? 'text-emerald-400' : 'text-rose-400'}`}>
            {data.status}
          </p>
        </div>
      </div>

      {/* Teacher Remarks */}
      <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl text-xs mb-6">
        <p className="font-semibold text-gray-800 mb-1">Class Teacher Remarks & Evaluation:</p>
        <p className="text-gray-700 italic">&ldquo;{data.teacherRemarks}&rdquo;</p>
      </div>

      <DocumentSignatureBlock principalName={data.school.principalName} showTeacher={true} showAccountant={false} />
    </DocumentLayout>
  );
}
