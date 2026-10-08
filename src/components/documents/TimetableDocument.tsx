'use client';

import React from 'react';
import { DocumentLayout } from './DocumentLayout';
import { SchoolLetterhead } from './SchoolLetterhead';
import { DocumentSignatureBlock } from './DocumentSignatureBlock';
import { SchoolBrandingData } from '@/actions/document.actions';

export interface TimetableScheduleItem {
  id: string;
  day: string;
  time: string;
  roomNo: string;
  teacherName: string;
  subjectName: string;
}

export interface TimetableDocumentData {
  school: SchoolBrandingData;
  className: string;
  sectionName: string;
  sessionName: string;
  schedule: TimetableScheduleItem[];
}

export function TimetableDocument({ data }: { data: TimetableDocumentData }) {
  return (
    <DocumentLayout>
      <SchoolLetterhead
        school={data.school}
        documentTitle="Official Class Timetable Schedule"
        documentSubTitle={`${data.className} (${data.sectionName}) - ${data.sessionName}`}
      />

      {/* Class Schedule Grid Table */}
      <table className="w-full text-left text-xs mb-6 border-collapse border border-gray-300">
        <thead className="bg-gray-100 font-semibold text-gray-800">
          <tr>
            <th className="p-2.5 border border-gray-300">Day</th>
            <th className="p-2.5 border border-gray-300">Time Period</th>
            <th className="p-2.5 border border-gray-300">Subject</th>
            <th className="p-2.5 border border-gray-300">Assigned Teacher</th>
            <th className="p-2.5 border border-gray-300 text-center">Room No</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {data.schedule.length > 0 ? (
            data.schedule.map((item) => (
              <tr key={item.id}>
                <td className="p-2.5 border border-gray-300 font-bold text-gray-900">{item.day}</td>
                <td className="p-2.5 border border-gray-300 font-mono text-[11px] text-gray-600">{item.time}</td>
                <td className="p-2.5 border border-gray-300 font-medium text-indigo-700">{item.subjectName}</td>
                <td className="p-2.5 border border-gray-300 text-gray-800">{item.teacherName}</td>
                <td className="p-2.5 border border-gray-300 text-center font-mono text-gray-700">{item.roomNo}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={5} className="p-6 text-center text-gray-400">
                No scheduled periods found for this class section.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <DocumentSignatureBlock principalName={data.school.principalName} showTeacher={true} showAccountant={false} />
    </DocumentLayout>
  );
}
