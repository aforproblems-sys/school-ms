'use client';

import React from 'react';
import { Building2, User, Phone, ShieldCheck } from 'lucide-react';
import { SchoolBrandingData } from '@/actions/document.actions';

export interface StudentIdCardData {
  school: SchoolBrandingData;
  studentName: string;
  admissionNo: string;
  rollNumber: string;
  className: string;
  sectionName: string;
  sessionName: string;
  emergencyPhone: string;
  avatarUrl?: string | null;
}

export function StudentIdCardDocument({ data }: { data: StudentIdCardData }) {
  return (
    <div className="print-container max-w-2xl mx-auto my-6 p-4 bg-white">
      <h3 className="text-xs font-semibold text-gray-400 mb-3 text-center no-print">
        Official Student Identity Card (Standard CR-80 Format - Front & Back)
      </h3>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
        {/* FRONT SIDE */}
        <div className="w-[320px] h-[480px] bg-gradient-to-b from-indigo-900 via-indigo-850 to-slate-900 text-white rounded-2xl p-5 shadow-2xl border border-indigo-700/50 relative overflow-hidden flex flex-col justify-between">
          {/* Top Branding Header */}
          <div className="text-center border-b border-indigo-500/30 pb-3">
            <div className="flex items-center justify-center gap-2 mb-1">
              {data.school.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={data.school.logoUrl} alt={data.school.name} className="w-8 h-8 object-contain rounded-md" />
              ) : (
                <Building2 className="w-6 h-6 text-indigo-400" />
              )}
              <h2 className="font-bold text-sm tracking-tight leading-tight uppercase text-indigo-100">
                {data.school.name}
              </h2>
            </div>
            <span className="inline-block bg-indigo-500/20 text-indigo-300 font-bold text-[9px] px-2 py-0.5 rounded-full uppercase tracking-widest border border-indigo-400/30">
              Student ID Card | {data.sessionName}
            </span>
          </div>

          {/* Student Photo Frame */}
          <div className="flex flex-col items-center my-2">
            <div className="w-24 h-28 rounded-xl border-2 border-indigo-400/50 bg-slate-800 overflow-hidden shadow-inner flex items-center justify-center mb-2">
              {data.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={data.avatarUrl} alt={data.studentName} className="w-full h-full object-cover" />
              ) : (
                <User className="w-12 h-12 text-indigo-300/60" />
              )}
            </div>
            <h3 className="font-extrabold text-base text-white tracking-wide text-center leading-tight">
              {data.studentName}
            </h3>
            <p className="text-xs text-indigo-300 font-semibold">{data.className} - {data.sectionName}</p>
          </div>

          {/* Details Table */}
          <div className="bg-indigo-950/60 border border-indigo-500/20 rounded-xl p-3 text-[11px] space-y-1">
            <div className="flex justify-between">
              <span className="text-indigo-300 font-medium">Admission No:</span>
              <span className="font-bold text-white">{data.admissionNo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-indigo-300 font-medium">Roll Number:</span>
              <span className="font-bold text-white">{data.rollNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-indigo-300 font-medium">Academic Year:</span>
              <span className="font-semibold text-white">{data.sessionName}</span>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="text-center pt-2 border-t border-indigo-500/30 text-[9px] text-indigo-400 flex items-center justify-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>Official Identity Record</span>
          </div>
        </div>

        {/* BACK SIDE */}
        <div className="w-[320px] h-[480px] bg-slate-900 text-slate-200 rounded-2xl p-5 shadow-2xl border border-slate-800 relative flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider mb-2 border-b border-slate-800 pb-1">
              Instructions & Emergency
            </h4>
            <ul className="text-[10px] text-slate-300 space-y-1.5 list-disc pl-3">
              <li>This card is non-transferable and must be displayed while on campus.</li>
              <li>Report loss of card immediately to the school administrative office.</li>
              <li>Property of {data.school.name}.</li>
            </ul>
          </div>

          {/* Contact Details */}
          <div className="bg-slate-800/80 border border-slate-700/50 rounded-xl p-3 text-[10px] space-y-1.5">
            <div className="flex items-center gap-1.5 text-amber-400 font-bold">
              <Phone className="w-3.5 h-3.5" />
              <span>Emergency Helpline:</span>
            </div>
            <p className="font-semibold text-white pl-5">{data.emergencyPhone}</p>
            <div className="pt-1.5 border-t border-slate-700 text-slate-400">
              <p>Campus Address: {data.school.address}</p>
              <p>School Office: {data.school.phone}</p>
            </div>
          </div>

          {/* Principal Stamp Box */}
          <div className="text-center border-t border-slate-800 pt-2">
            <div className="italic text-[10px] text-slate-400 font-serif mb-1">E. Vance</div>
            <p className="text-[9px] font-bold text-slate-300 uppercase">Authorized Signatory</p>
          </div>
        </div>
      </div>
    </div>
  );
}
