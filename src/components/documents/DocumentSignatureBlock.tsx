'use client';

import React from 'react';

interface DocumentSignatureBlockProps {
  principalName?: string;
  showTeacher?: boolean;
  showAccountant?: boolean;
  showParent?: boolean;
}

export function DocumentSignatureBlock({
  principalName = 'Dr. Elizabeth Vance, Ph.D.',
  showTeacher = true,
  showAccountant = true,
  showParent = false,
}: DocumentSignatureBlockProps) {
  return (
    <div className="mt-12 pt-6 border-t border-gray-200 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center text-xs text-gray-700">
      {showTeacher && (
        <div>
          <div className="border-b border-gray-400 h-10 mb-2 flex items-end justify-center italic text-gray-400 text-[10px]">
            Class Teacher Signature
          </div>
          <p className="font-semibold">Class Teacher</p>
        </div>
      )}

      {showAccountant && (
        <div>
          <div className="border-b border-gray-400 h-10 mb-2 flex items-end justify-center italic text-gray-400 text-[10px]">
            Finance Officer Stamp
          </div>
          <p className="font-semibold">Accountant / Cashier</p>
        </div>
      )}

      {showParent && (
        <div>
          <div className="border-b border-gray-400 h-10 mb-2 flex items-end justify-center italic text-gray-400 text-[10px]">
            Parent / Guardian Signature
          </div>
          <p className="font-semibold">Parent / Guardian</p>
        </div>
      )}

      <div>
        <div className="border-b border-gray-400 h-10 mb-2 flex items-end justify-center italic text-gray-800 font-serif font-bold">
          E. Vance
        </div>
        <p className="font-bold text-gray-900">{principalName}</p>
        <p className="text-[10px] text-gray-500">School Principal</p>
      </div>
    </div>
  );
}
