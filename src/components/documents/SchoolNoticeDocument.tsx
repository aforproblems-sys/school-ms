'use client';

import React from 'react';
import { DocumentLayout } from './DocumentLayout';
import { SchoolLetterhead } from './SchoolLetterhead';
import { DocumentSignatureBlock } from './DocumentSignatureBlock';
import { SchoolBrandingData } from '@/actions/document.actions';

export interface SchoolNoticeDocumentData {
  school: SchoolBrandingData;
  noticeTitle: string;
  content: string;
  targetRole: string;
  publishDate: string;
  authorName: string;
  authorRole: string;
}

export function SchoolNoticeDocument({ data }: { data: SchoolNoticeDocumentData }) {
  return (
    <DocumentLayout>
      <SchoolLetterhead school={data.school} documentTitle="Official Institutional Notice" documentSubTitle={`Ref Date: ${data.publishDate}`} />

      {/* Notice Target Banner */}
      <div className="bg-indigo-50 border border-indigo-200 p-3 rounded-xl mb-6 flex justify-between items-center text-xs">
        <div>
          <span className="text-indigo-600 font-medium">Target Audience: </span>
          <span className="font-bold text-indigo-900 uppercase">{data.targetRole.replace(/_/g, ' ')}</span>
        </div>
        <div>
          <span className="text-gray-500">Issued By: </span>
          <span className="font-semibold text-gray-800">{data.authorName} ({data.authorRole})</span>
        </div>
      </div>

      {/* Main Notice Title */}
      <div className="mb-6 text-center">
        <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight underline underline-offset-4 decoration-2 decoration-indigo-600">
          {data.noticeTitle}
        </h2>
      </div>

      {/* Notice Body Text */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 text-sm text-gray-800 leading-relaxed mb-8 min-h-[200px] whitespace-pre-wrap font-serif">
        {data.content}
      </div>

      <DocumentSignatureBlock principalName={data.school.principalName} showTeacher={false} showAccountant={false} />
    </DocumentLayout>
  );
}
