'use client';

import React from 'react';
import { X, Printer, Download } from 'lucide-react';
import { triggerPrint } from '@/lib/export-utils';

interface DocumentViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function DocumentViewerModal({ isOpen, onClose, title, children }: DocumentViewerModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-gray-100 dark:bg-gray-900 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl border border-gray-200 dark:border-gray-800">
        {/* Modal Action Header (Hidden in Print) */}
        <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 rounded-t-2xl no-print">
          <div>
            <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">{title}</h3>
            <p className="text-xs text-gray-500">Official Institutional Document Preview & Export</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={triggerPrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Download PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Document Content Container */}
        <div className="p-6 overflow-y-auto flex-1 bg-gray-100 dark:bg-gray-950">
          {children}
        </div>
      </div>
    </div>
  );
}
