'use client';

import React from 'react';
import { User } from 'lucide-react';
import { DocumentLayout } from './DocumentLayout';
import { SchoolLetterhead } from './SchoolLetterhead';
import { DocumentSignatureBlock } from './DocumentSignatureBlock';
import { SchoolBrandingData } from '@/actions/document.actions';

export interface AdmissionFormData {
  school: SchoolBrandingData;
  admissionNo: string;
  admissionDate: string;
  studentName: string;
  email: string;
  phone: string;
  gender: string;
  dateOfBirth: string;
  bloodGroup: string;
  address: string;
  className: string;
  sectionName: string;
  sessionName: string;
  guardianName: string;
  guardianPhone: string;
  guardianEmail: string;
  relationship: string;
  avatarUrl?: string | null;
}

export function AdmissionFormDocument({ data }: { data: AdmissionFormData }) {
  return (
    <DocumentLayout>
      <SchoolLetterhead school={data.school} documentTitle="Student Registration & Admission Form" documentSubTitle={`Admission No: ${data.admissionNo}`} />

      {/* Header Info Bar with Photo Frame */}
      <div className="flex justify-between items-start mb-6 border border-gray-200 p-4 rounded-xl bg-gray-50">
        <div className="space-y-1.5 text-xs text-gray-700">
          <p>
            Official Admission Reference: <span className="font-bold text-gray-900">{data.admissionNo}</span>
          </p>
          <p>
            Admission Date: <span className="font-semibold text-gray-900">{data.admissionDate}</span>
          </p>
          <p>
            Academic Session: <span className="font-semibold text-gray-900">{data.sessionName}</span>
          </p>
          <p>
            Assigned Class & Section: <span className="font-bold text-indigo-600">{data.className} ({data.sectionName})</span>
          </p>
        </div>

        {/* Passport Photo Box */}
        <div className="w-28 h-32 border-2 border-dashed border-gray-400 bg-white rounded-lg flex flex-col items-center justify-center text-center p-2">
          {data.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.avatarUrl} alt={data.studentName} className="w-full h-full object-cover rounded-md" />
          ) : (
            <>
              <User className="w-8 h-8 text-gray-400 mb-1" />
              <span className="text-[9px] text-gray-400 font-medium">Affix Student Photograph</span>
            </>
          )}
        </div>
      </div>

      {/* Section 1: Student Information */}
      <div className="mb-6">
        <h3 className="font-bold text-xs uppercase tracking-wider text-gray-900 border-b border-gray-300 pb-1.5 mb-3 bg-gray-100 p-2 rounded-md">
          1. Student Personal Information
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <p className="text-gray-500 font-medium">Full Name</p>
            <p className="font-bold text-gray-900">{data.studentName}</p>
          </div>
          <div>
            <p className="text-gray-500 font-medium">Gender</p>
            <p className="font-semibold text-gray-800">{data.gender}</p>
          </div>
          <div>
            <p className="text-gray-500 font-medium">Date of Birth</p>
            <p className="font-semibold text-gray-800">{data.dateOfBirth}</p>
          </div>
          <div>
            <p className="text-gray-500 font-medium">Blood Group</p>
            <p className="font-semibold text-gray-800">{data.bloodGroup}</p>
          </div>
          <div>
            <p className="text-gray-500 font-medium">Email Address</p>
            <p className="font-semibold text-gray-800">{data.email}</p>
          </div>
          <div>
            <p className="text-gray-500 font-medium">Contact Phone</p>
            <p className="font-semibold text-gray-800">{data.phone}</p>
          </div>
          <div className="col-span-2 sm:col-span-3">
            <p className="text-gray-500 font-medium">Residential Address</p>
            <p className="font-semibold text-gray-800">{data.address}</p>
          </div>
        </div>
      </div>

      {/* Section 2: Parent / Guardian Information */}
      <div className="mb-6">
        <h3 className="font-bold text-xs uppercase tracking-wider text-gray-900 border-b border-gray-300 pb-1.5 mb-3 bg-gray-100 p-2 rounded-md">
          2. Parent / Guardian Contact Details
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <p className="text-gray-500 font-medium">Guardian Name</p>
            <p className="font-bold text-gray-900">{data.guardianName}</p>
          </div>
          <div>
            <p className="text-gray-500 font-medium">Relationship</p>
            <p className="font-semibold text-gray-800">{data.relationship}</p>
          </div>
          <div>
            <p className="text-gray-500 font-medium">Emergency Contact Phone</p>
            <p className="font-bold text-indigo-600">{data.guardianPhone}</p>
          </div>
          <div className="col-span-2 sm:col-span-3">
            <p className="text-gray-500 font-medium">Guardian Email</p>
            <p className="font-semibold text-gray-800">{data.guardianEmail}</p>
          </div>
        </div>
      </div>

      {/* Declaration */}
      <div className="border border-gray-200 bg-gray-50 p-3 rounded-xl text-[11px] text-gray-600 mb-4">
        <p className="font-semibold text-gray-800 mb-1">Parental Declaration & Undertaking:</p>
        <p>
          I hereby declare that the particulars given above are true to the best of my knowledge and belief. I agree to abide by the rules, policies, and regulations of the institution.
        </p>
      </div>

      <DocumentSignatureBlock principalName={data.school.principalName} showTeacher={false} showAccountant={false} showParent={true} />
    </DocumentLayout>
  );
}
