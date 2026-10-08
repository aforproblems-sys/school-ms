'use client';

import React from 'react';
import { DocumentLayout } from './DocumentLayout';
import { SchoolLetterhead } from './SchoolLetterhead';
import { DocumentSignatureBlock } from './DocumentSignatureBlock';
import { SchoolBrandingData } from '@/actions/document.actions';

export interface FeeReceiptData {
  school: SchoolBrandingData;
  receiptNo: string;
  paymentDate: string;
  studentName: string;
  admissionNo: string;
  className: string;
  sectionName: string;
  invoiceNo: string;
  feeItemName: string;
  totalAmount: number;
  discountAmount: number;
  lateFeeAmount: number;
  paidAmount: number;
  totalPaidToDate: number;
  remainingBalance: number;
  paymentMethod: string;
  recordedBy: string;
  status: string;
}

export function FeeReceiptDocument({ data }: { data: FeeReceiptData }) {
  return (
    <DocumentLayout>
      <SchoolLetterhead school={data.school} documentTitle="Official Fee Payment Receipt" documentSubTitle={`Receipt #${data.receiptNo}`} />

      {/* Student & Payment Summary Grid */}
      <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl text-xs mb-6 border border-gray-200">
        <div>
          <p className="text-gray-500 font-medium">Student Name:</p>
          <p className="font-bold text-gray-900 text-sm">{data.studentName}</p>
          <p className="text-gray-600 mt-1">
            Admission No: <span className="font-semibold text-gray-900">{data.admissionNo}</span>
          </p>
          <p className="text-gray-600">
            Class & Section: <span className="font-semibold text-gray-900">{data.className} - {data.sectionName}</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-gray-500 font-medium">Payment Transaction Date:</p>
          <p className="font-bold text-gray-900">{data.paymentDate}</p>
          <p className="text-gray-600 mt-1">
            Invoice Reference: <span className="font-semibold text-gray-900">{data.invoiceNo}</span>
          </p>
          <p className="text-gray-600">
            Payment Method: <span className="font-semibold text-gray-900">{data.paymentMethod}</span>
          </p>
        </div>
      </div>

      {/* Fee Items Table */}
      <table className="w-full text-left text-xs mb-6 border-collapse border border-gray-300">
        <thead className="bg-gray-100 font-semibold text-gray-800">
          <tr>
            <th className="p-2.5 border border-gray-300">Fee Item Description</th>
            <th className="p-2.5 border border-gray-300 text-right">Invoiced Amount</th>
            <th className="p-2.5 border border-gray-300 text-right">Discount</th>
            <th className="p-2.5 border border-gray-300 text-right">Late Charge</th>
            <th className="p-2.5 border border-gray-300 text-right">Amount Paid</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          <tr>
            <td className="p-2.5 border border-gray-300 font-medium">{data.feeItemName}</td>
            <td className="p-2.5 border border-gray-300 text-right">${data.totalAmount.toFixed(2)}</td>
            <td className="p-2.5 border border-gray-300 text-right text-emerald-600">-${data.discountAmount.toFixed(2)}</td>
            <td className="p-2.5 border border-gray-300 text-right text-amber-600">+${data.lateFeeAmount.toFixed(2)}</td>
            <td className="p-2.5 border border-gray-300 text-right font-bold text-gray-900">${data.paidAmount.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      {/* Ledger Totals Summary */}
      <div className="flex justify-end mb-6">
        <div className="w-64 bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs space-y-1.5">
          <div className="flex justify-between text-gray-600">
            <span>Payment Made:</span>
            <span className="font-bold text-gray-900">${data.paidAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Total Paid To Date:</span>
            <span className="font-semibold text-gray-900">${data.totalPaidToDate.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-900 pt-1.5 border-t border-gray-300 font-bold text-sm">
            <span>Remaining Balance:</span>
            <span className={data.remainingBalance > 0 ? 'text-amber-600' : 'text-emerald-600'}>
              ${data.remainingBalance.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      <p className="text-[11px] text-gray-500 italic mb-4">
        Received By: <span className="font-semibold text-gray-800">{data.recordedBy}</span>
      </p>

      <DocumentSignatureBlock principalName={data.school.principalName} showTeacher={false} showAccountant={true} />
    </DocumentLayout>
  );
}
