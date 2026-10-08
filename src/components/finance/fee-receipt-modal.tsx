'use client';

import React, { useState, useEffect } from 'react';
import { getFeeReceiptByIdAction } from '@/actions/fee.actions';
import { Printer, CheckCircle2, Building2, ShieldCheck, X, Loader2 } from 'lucide-react';

interface FeeReceiptModalProps {
  isOpen: boolean;
  paymentId: string | null;
  onClose: () => void;
}

export function FeeReceiptModal({ isOpen, paymentId, onClose }: FeeReceiptModalProps) {
  const [loading, setLoading] = useState(true);
  const [receipt, setReceipt] = useState<any | null>(null);

  useEffect(() => {
    if (isOpen && paymentId) {
      setLoading(true);
      getFeeReceiptByIdAction(paymentId).then((res) => {
        if (res.success && res.receipt) {
          setReceipt(res.receipt);
        }
        setLoading(false);
      });
    }
  }, [isOpen, paymentId]);

  if (!isOpen || !paymentId) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in-50">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 print:hidden">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Official Fee Receipt</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Receipt</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            <p className="text-xs">Generating printable receipt...</p>
          </div>
        ) : !receipt ? (
          <div className="py-8 text-center text-xs text-rose-500 font-semibold">
            Receipt record not found.
          </div>
        ) : (
          <div id="printable-receipt" className="space-y-6 text-slate-900 dark:text-white">
            {/* Header branding */}
            <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white font-black text-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
                  SMS
                </div>
                <div>
                  <h2 className="text-lg font-extrabold tracking-tight">EduManage Academy</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">100 Knowledge Avenue, Education City</p>
                  <p className="text-[10px] text-slate-400 font-mono">Tax ID: SCH-8849-2026</p>
                </div>
              </div>

              <div className="text-right">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>PAYMENT RECEIVED</span>
                </span>
                <p className="text-xs font-mono font-bold mt-2 text-indigo-600 dark:text-indigo-400">
                  Receipt #{receipt.receiptNo}
                </p>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                  Date: {new Date(receipt.paymentDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                </p>
              </div>
            </div>

            {/* Student & Payment Meta */}
            <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Student Information</p>
                <p className="font-bold text-sm text-slate-900 dark:text-white mt-1">{receipt.student.fullName}</p>
                <p className="text-slate-500 dark:text-slate-400 font-medium">Admission No: <strong className="font-mono text-slate-800 dark:text-slate-200">{receipt.student.admissionNo}</strong></p>
                <p className="text-slate-500 dark:text-slate-400 font-medium">Grade & Stream: {receipt.student.className} - {receipt.student.sectionName}</p>
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Payment Details</p>
                <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Invoice Reference: <strong className="font-mono text-slate-800 dark:text-slate-200">{receipt.invoiceNo}</strong></p>
                <p className="text-slate-500 dark:text-slate-400 font-medium">Method: <strong className="uppercase text-slate-800 dark:text-slate-200">{receipt.paymentMethod.replace('_', ' ')}</strong></p>
                <p className="text-slate-500 dark:text-slate-400 font-medium">Cashier / Staff: {receipt.receivedBy}</p>
              </div>
            </div>

            {/* Itemized Line Items Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-200 dark:border-slate-800 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="pb-2">Description</th>
                    <th className="pb-2 text-right">Base Amount</th>
                    <th className="pb-2 text-right">Discount</th>
                    <th className="pb-2 text-right">Surcharge</th>
                    <th className="pb-2 text-right">Net Invoiced</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  <tr>
                    <td className="py-3 font-semibold text-slate-900 dark:text-white">{receipt.feeName}</td>
                    <td className="py-3 text-right font-mono">${receipt.baseAmount.toFixed(2)}</td>
                    <td className="py-3 text-right font-mono text-emerald-600 dark:text-emerald-400">-${receipt.discountAmount.toFixed(2)}</td>
                    <td className="py-3 text-right font-mono text-amber-500">+${receipt.lateFeeAmount.toFixed(2)}</td>
                    <td className="py-3 text-right font-mono font-bold text-slate-900 dark:text-white">${receipt.totalInvoiced.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Financial Totals Breakdown */}
            <div className="border-t border-slate-200 dark:border-slate-800 pt-4 flex flex-col items-end space-y-1.5 text-xs font-medium">
              <div className="flex justify-between w-64 text-slate-500">
                <span>Total Invoiced:</span>
                <span className="font-mono font-semibold">${receipt.totalInvoiced.toFixed(2)}</span>
              </div>
              <div className="flex justify-between w-64 text-emerald-600 dark:text-emerald-400 font-bold text-sm border-t border-b border-slate-200 dark:border-slate-800 py-1.5">
                <span>Amount Paid Now:</span>
                <span className="font-mono">${receipt.amountPaid.toFixed(2)}</span>
              </div>
              <div className="flex justify-between w-64 text-slate-500">
                <span>Remaining Balance:</span>
                <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">${receipt.remainingBalance.toFixed(2)}</span>
              </div>
            </div>

            {/* Signature & Disclaimer Footer */}
            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Computer Generated Official Receipt. No Signature Required.</span>
              </div>
              <p className="font-mono">EduManage SMS v1.0 Security Verified</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
