'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { collectFeePaymentAction } from '@/actions/fee.actions';
import { CollectPaymentFormValues } from '@/schemas/fee.schema';
import { PaymentMethod } from '@prisma/client';
import { CreditCard, Loader2, DollarSign, Receipt, CheckCircle2, AlertCircle, X } from 'lucide-react';

interface CollectPaymentDialogProps {
  isOpen: boolean;
  invoice: {
    id: string;
    invoiceNo: string;
    feeName: string;
    studentName: string;
    admissionNo: string;
    amount: number;
    paidAmount: number;
    remainingBalance: number;
  } | null;
  onClose: () => void;
  onSuccess: (receipt: any) => void;
}

export function CollectPaymentDialog({
  isOpen,
  invoice,
  onClose,
  onSuccess,
}: CollectPaymentDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<CollectPaymentFormValues>({
    studentFeeId: '',
    amount: 0,
    paymentMethod: PaymentMethod.CASH,
    referenceNo: '',
  });

  useEffect(() => {
    if (invoice && isOpen) {
      setFormData({
        studentFeeId: invoice.id,
        amount: invoice.remainingBalance,
        paymentMethod: PaymentMethod.CASH,
        referenceNo: '',
      });
      setError(null);
    }
  }, [invoice, isOpen]);

  if (!isOpen || !invoice) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const res = await collectFeePaymentAction(formData);
      if (res.success && res.receipt) {
        onSuccess(res.receipt);
        onClose();
      } else {
        setError(res.error || 'Failed to collect payment');
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in-50">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-indigo-500" />
              <span>Collect Fee Payment</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Record full or partial payment for Invoice <span className="font-mono font-bold text-slate-900 dark:text-white">{invoice.invoiceNo}</span>.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Invoice Summary Box */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 space-y-2 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Student:</span>
            <span className="font-bold text-slate-900 dark:text-white">{invoice.studentName} ({invoice.admissionNo})</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Fee Item:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{invoice.feeName}</span>
          </div>
          <div className="border-t border-slate-200 dark:border-slate-700/60 pt-2 flex justify-between items-center">
            <span className="text-slate-400">Total Invoiced: <strong className="text-slate-700 dark:text-slate-300">${invoice.amount.toFixed(2)}</strong></span>
            <span className="text-slate-400">Paid: <strong className="text-emerald-600 dark:text-emerald-400">${invoice.paidAmount.toFixed(2)}</strong></span>
            <span className="text-slate-400">Remaining: <strong className="text-indigo-600 dark:text-indigo-400">${invoice.remainingBalance.toFixed(2)}</strong></span>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
              Payment Amount ($)
            </label>
            <div className="relative">
              <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="number"
                step="0.01"
                required
                min="0.01"
                max={invoice.remainingBalance}
                value={formData.amount}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))
                }
                className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold text-base text-slate-900 dark:text-white"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Maximum allowable payment for this transaction: ${invoice.remainingBalance.toFixed(2)}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
                Payment Method
              </label>
              <select
                value={formData.paymentMethod}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, paymentMethod: e.target.value as PaymentMethod }))
                }
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
              >
                <option value={PaymentMethod.CASH}>Cash Payment</option>
                <option value={PaymentMethod.BANK_TRANSFER}>Bank Wire Transfer</option>
                <option value={PaymentMethod.CREDIT_CARD}>Credit / Debit Card</option>
                <option value={PaymentMethod.CHEQUE}>Cheque</option>
                <option value={PaymentMethod.ONLINE_GATEWAY}>Online Payment Gateway</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
                Reference / Cheque No (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. CHQ-99823 or TXN-441"
                value={formData.referenceNo || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, referenceNo: e.target.value }))}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>
          </div>

          {/* Footer Controls */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-md shadow-indigo-600/30 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing Payment...</span>
                </>
              ) : (
                <>
                  <Receipt className="w-4 h-4" />
                  <span>Confirm Payment & Print Receipt</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
