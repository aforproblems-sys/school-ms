'use client';

import React from 'react';
import { DocumentLayout } from './DocumentLayout';
import { SchoolLetterhead } from './SchoolLetterhead';
import { DocumentSignatureBlock } from './DocumentSignatureBlock';
import { SchoolBrandingData } from '@/actions/document.actions';

export interface AttendanceRecordItem {
  date: string;
  status: string;
  remarks?: string;
  totalStudents?: number;
  presentStudents?: number;
  absentStudents?: number;
  rate?: string;
}

export interface AttendanceReportData {
  school: SchoolBrandingData;
  title: string;
  studentName?: string;
  admissionNo?: string;
  className: string;
  sectionName: string;
  totalWorkingDays: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  leaveCount: number;
  attendancePercentage: string;
  records: AttendanceRecordItem[];
}

export function AttendanceReportDocument({ data }: { data: AttendanceReportData }) {
  return (
    <DocumentLayout>
      <SchoolLetterhead school={data.school} documentTitle="Official Attendance Report" documentSubTitle={data.title} />

      {/* Class / Student Info Bar */}
      <div className="bg-gray-50 p-4 rounded-xl text-xs grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 border border-gray-200">
        <div>
          <p className="text-gray-500 font-medium">Class & Section</p>
          <p className="font-bold text-gray-900 text-sm">{data.className} ({data.sectionName})</p>
        </div>
        {data.studentName && (
          <div>
            <p className="text-gray-500 font-medium">Student Name</p>
            <p className="font-bold text-gray-900 text-sm">{data.studentName}</p>
          </div>
        )}
        <div>
          <p className="text-gray-500 font-medium">Total Session Days</p>
          <p className="font-semibold text-gray-900">{data.totalWorkingDays} Days</p>
        </div>
        <div>
          <p className="text-gray-500 font-medium">Attendance Percentage</p>
          <p className="font-bold text-indigo-600 text-sm">{data.attendancePercentage}</p>
        </div>
      </div>

      {/* Stat Summary Cards */}
      <div className="grid grid-cols-4 gap-3 mb-6 text-center text-xs">
        <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl">
          <p className="text-emerald-800 font-medium text-[10px]">PRESENT</p>
          <p className="font-bold text-emerald-700 text-base">{data.presentCount}</p>
        </div>
        <div className="bg-rose-50 border border-rose-200 p-2.5 rounded-xl">
          <p className="text-rose-800 font-medium text-[10px]">ABSENT</p>
          <p className="font-bold text-rose-700 text-base">{data.absentCount}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-xl">
          <p className="text-amber-800 font-medium text-[10px]">LATE</p>
          <p className="font-bold text-amber-700 text-base">{data.lateCount}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 p-2.5 rounded-xl">
          <p className="text-blue-800 font-medium text-[10px]">LEAVE / EXCUSED</p>
          <p className="font-bold text-blue-700 text-base">{data.leaveCount}</p>
        </div>
      </div>

      {/* Daily Records Table */}
      <table className="w-full text-left text-xs mb-6 border-collapse border border-gray-300">
        <thead className="bg-gray-100 font-semibold text-gray-800">
          <tr>
            <th className="p-2.5 border border-gray-300">Date</th>
            {data.records[0]?.status ? (
              <>
                <th className="p-2.5 border border-gray-300 text-center">Status</th>
                <th className="p-2.5 border border-gray-300">Remarks</th>
              </>
            ) : (
              <>
                <th className="p-2.5 border border-gray-300 text-right">Enrolled Students</th>
                <th className="p-2.5 border border-gray-300 text-right">Present</th>
                <th className="p-2.5 border border-gray-300 text-right">Absent</th>
                <th className="p-2.5 border border-gray-300 text-center">Class Rate</th>
              </>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {data.records.map((r, idx) => (
            <tr key={idx}>
              <td className="p-2.5 border border-gray-300 font-medium">{r.date}</td>
              {r.status ? (
                <>
                  <td className="p-2.5 border border-gray-300 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        r.status === 'PRESENT'
                          ? 'bg-emerald-100 text-emerald-800'
                          : r.status === 'LATE'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="p-2.5 border border-gray-300 text-gray-600">{r.remarks || '-'}</td>
                </>
              ) : (
                <>
                  <td className="p-2.5 border border-gray-300 text-right">{r.totalStudents}</td>
                  <td className="p-2.5 border border-gray-300 text-right text-emerald-700 font-semibold">{r.presentStudents}</td>
                  <td className="p-2.5 border border-gray-300 text-right text-rose-700 font-semibold">{r.absentStudents}</td>
                  <td className="p-2.5 border border-gray-300 text-center font-bold text-indigo-600">{r.rate}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      <DocumentSignatureBlock principalName={data.school.principalName} showTeacher={true} showAccountant={false} />
    </DocumentLayout>
  );
}
