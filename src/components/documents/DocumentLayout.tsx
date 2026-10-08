'use client';

import React from 'react';

interface DocumentLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function DocumentLayout({ children, className = '' }: DocumentLayoutProps) {
  return (
    <div className={`print-container bg-white text-gray-900 p-8 max-w-4xl mx-auto border border-gray-200 rounded-2xl shadow-lg my-4 ${className}`}>
      {children}
      
      {/* Universal Document Footer Note */}
      <div className="mt-8 pt-4 border-t border-gray-100 text-[10px] text-gray-400 flex items-center justify-between">
        <p>This document is generated directly from the School Management System PostgreSQL Database.</p>
        <p>Page 1 of 1</p>
      </div>
    </div>
  );
}
