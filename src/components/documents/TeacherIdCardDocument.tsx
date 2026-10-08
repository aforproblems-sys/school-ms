'use client';

import React from 'react';
import { Building2, UserCheck, ShieldCheck, Mail, Phone } from 'lucide-react';
import { SchoolBrandingData } from '@/actions/document.actions';

export interface TeacherIdCardData {
  school: SchoolBrandingData;
  teacherName: string;
  employeeId: string;
  department: string;
  qualification: string;
  phone: string;
  email: string;
  sessionName: string;
  avatarUrl?: string | null;
}

export function TeacherIdCardDocument({ data }: { data: TeacherIdCardData }) {
  return (
    <div className="print-container max-w-2xl mx-auto my-6 p-4 bg-white">
      <h3 className="text-xs font-semibold text-gray-400 mb-3 text-center no-print">
        Official Faculty & Staff Identity Card (Standard CR-80 Format)
      </h3>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
        {/* FRONT SIDE */}
        <div className="w-[320px] h-[480px] bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 shadow-2xl border border-slate-700 relative overflow-hidden flex flex-col justify-between">
          <div className="text-center border-b border-slate-700 pb-3">
            <div className="flex items-center justify-center gap-2 mb-1">
              {data.school.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={data.school.logoUrl} alt={data.school.name} className="w-8 h-8 object-contain rounded-md" />
              ) : (
                <Building2 className="w-6 h-6 text-emerald-400" />
              )}
              <h2 className="font-bold text-sm tracking-tight uppercase text-slate-100">
                {data.school.name}
              </h2>
            </div>
            <span className="inline-block bg-emerald-500/20 text-emerald-300 font-bold text-[9px] px-2 py-0.5 rounded-full uppercase tracking-widest border border-emerald-400/30">
              Faculty / Staff Card | {data.sessionName}
            </span>
          </div>

          <div className="flex flex-col items-center my-2">
            <div className="w-24 h-28 rounded-xl border-2 border-emerald-400/50 bg-slate-800 overflow-hidden shadow-inner flex items-center justify-center mb-2">
              {data.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={data.avatarUrl} alt={data.teacherName} className="w-full h-full object-cover" />
              ) : (
                <UserCheck className="w-12 h-12 text-emerald-300/60" />
              )}
            </div>
            <h3 className="font-extrabold text-base text-white tracking-wide text-center leading-tight">
              {data.teacherName}
            </h3>
            <p className="text-xs text-emerald-300 font-semibold">{data.department}</p>
          </div>

          <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3 text-[11px] space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400 font-medium">Employee ID:</span>
              <span className="font-bold text-white">{data.employeeId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-medium">Qualification:</span>
              <span className="font-semibold text-white">{data.qualification}</span>
            </div>
          </div>

          <div className="text-center pt-2 border-t border-slate-800 text-[9px] text-slate-400 flex items-center justify-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>Authorized Faculty Member</span>
          </div>
        </div>

        {/* BACK SIDE */}
        <div className="w-[320px] h-[480px] bg-slate-900 text-slate-200 rounded-2xl p-5 shadow-2xl border border-slate-800 relative flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider mb-2 border-b border-slate-800 pb-1">
              Faculty Contact Information
            </h4>
            <div className="space-y-2 text-[10px] text-slate-300">
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                <span>Phone: {data.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-emerald-400" />
                <span>Email: {data.email}</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/50 rounded-xl p-3 text-[10px]">
            <p className="font-semibold text-white mb-1">Campus Address:</p>
            <p className="text-slate-400">{data.school.address}</p>
          </div>

          <div className="text-center border-t border-slate-800 pt-2">
            <div className="italic text-[10px] text-slate-400 font-serif mb-1">E. Vance</div>
            <p className="text-[9px] font-bold text-slate-300 uppercase">Authorized Principal Signature</p>
          </div>
        </div>
      </div>
    </div>
  );
}
