'use client';

import React from 'react';
import { DocumentLayout } from './DocumentLayout';
import { SchoolLetterhead } from './SchoolLetterhead';
import { DocumentSignatureBlock } from './DocumentSignatureBlock';
import { SchoolBrandingData } from '@/actions/document.actions';

export interface FeeStatementHistoryItem {
  id: string;
  invoiceNo: string;
  feeName: string;
  dueDate: string;
  amount: number;
  discount: number;
  paidAmount: number;
  balance: number;
  status: string;
  receipts: string;
}

export interface FeeStatementData {
  school: SchoolBrandingData;
  studentName: string;
  admissionNo: string;
  rollNumber: string;
  className: string;
  sectionName: string;
  sessionName: string;
  totalInvoiced: number;
  totalPaid: number;
  totalDiscounts: number;
  outstandingBalance: number;
  history: FeeStatementHistoryItem[];
}

export function FeeStatementDocument({ data }: { data: FeeStatementData }) {
  return (
    <DocumentLayout>
      <SchoolLetterhead school={data.school} documentTitle="Student Fee Ledger & Account Statement" documentSubTitle={`Session: ${data.sessionName}`} />

      {/* Student Details Header */}
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
          <p className="text-gray-500 font-medium">Roll Number</p>
          <p className="font-semibold text-gray-900">{data.rollNumber}</p>
        </div>
      </div>

      {/* Statement Table */}
      <table className="w-full text-left text-xs mb-6 border-collapse border border-gray-300">
        <thead className="bg-gray-100 font-semibold text-gray-800">
          <tr>
            <th className="p-2 border border-gray-300">Invoice #</th>
            <th className="p-2 border border-gray-300">Fee Description</th>
            <th className="p-2 border border-gray-300">Due Date</th>
            <th className="p-2 border border-gray-300 text-right">Invoiced</th>
            <th className="p-2 border border-gray-300 text-right">Discount</th>
            <th className="p-2 border border-gray-300 text-right">Paid</th>
            <th className="p-2 border border-gray-300 text-right">Balance</th>
            <th className="p-2 border border-gray-300 text-center">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {data.history.map((item) => (
            <tr key={item.id}>
              <td className="p-2 border border-gray-300 font-mono text-[11px]">{item.invoiceNo}</td>
              <td className="p-2 border border-gray-300 font-medium">{item.feeName}</td>
              <td className="p-2 border border-gray-300">{item.dueDate}</td>
              <td className="p-2 border border-gray-300 text-right">${item.amount.toFixed(2)}</td>
              <td className="p-2 border border-gray-300 text-right text-emerald-600">-${item.discount.toFixed(2)}</td>
              <td className="p-2 border border-gray-300 text-right font-semibold">${item.paidAmount.toFixed(2)}</td>
              <td className="p-2 border border-gray-300 text-right font-bold text-gray-900">${item.balance.toFixed(2)}</td>
              <td className="p-2 border border-gray-300 text-center">
                <span
                  className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    item.status === 'PAID'
                      ? 'bg-emerald-100 text-emerald-800'
                      : item.status === 'PARTIALLY_PAID'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {item.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Account Balance Summary Card */}
      <div className="flex justify-end mb-6">
        <div className="w-72 bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs space-y-2">
          <div className="flex justify-between text-gray-600">
            <span>Total Invoiced:</span>
            <span className="font-semibold text-gray-900">${data.totalInvoiced.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Total Payments Received:</span>
            <span className="font-semibold text-emerald-600">${data.totalPaid.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Total Discounts Awarded:</span>
            <span className="font-semibold text-gray-700">${data.totalDiscounts.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-900 pt-2 border-t border-gray-300 font-bold text-sm">
            <span>Current Outstanding Balance:</span>
            <span className={data.outstandingBalance > 0 ? 'text-amber-600' : 'text-emerald-600'}>
              ${data.outstandingBalance.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      <DocumentSignatureBlock principalName={data.school.principalName} showTeacher={false} showAccountant={true} />
    </DocumentLayout>
  );
}
