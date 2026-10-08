'use client';

import React from 'react';
import { Building2 } from 'lucide-react';
import { SchoolBrandingData } from '@/actions/document.actions';

interface SchoolLetterheadProps {
  school: SchoolBrandingData;
  documentTitle: string;
  documentSubTitle?: string;
}

export function SchoolLetterhead({ school, documentTitle, documentSubTitle }: SchoolLetterheadProps) {
  return (
    <div className="border-b-2 border-gray-900 pb-4 mb-6">
      <div className="flex items-center justify-between gap-4">
        {/* Logo / School Branding */}
        <div className="flex items-center gap-3">
          {school.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={school.logoUrl} alt={school.name} className="w-14 h-14 object-contain rounded-lg" />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xl shadow-xs">
              <Building2 className="w-8 h-8" />
            </div>
          )}
          <div>
            <h1 className="text-xl font-black tracking-tight text-gray-900 uppercase">
              {school.name}
            </h1>
            <p className="text-xs text-gray-600 font-medium">{school.address}</p>
            <p className="text-[11px] text-gray-500">
              Tel: {school.phone} | Email: {school.email} | Code: {school.code}
            </p>
          </div>
        </div>

        {/* Document Title Header */}
        <div className="text-right">
          <span className="inline-block px-3 py-1 bg-gray-900 text-white font-bold text-xs rounded-md uppercase tracking-wider mb-1">
            {documentTitle}
          </span>
          {documentSubTitle && (
            <p className="text-xs font-semibold text-gray-700">{documentSubTitle}</p>
          )}
          <p className="text-[10px] text-gray-400">
            Issued: {new Date().toLocaleDateString('en-US', { dateStyle: 'medium' })}
          </p>
        </div>
      </div>
    </div>
  );
}
