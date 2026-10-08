'use client';

import React from 'react';
import { Users, CalendarCheck, Landmark, GraduationCap, UserCheck, Wallet } from 'lucide-react';

export type ReportCategory = 'STUDENT' | 'ATTENDANCE' | 'FEE' | 'EXAM' | 'TEACHER' | 'FINANCIAL';

interface ReportCategoryTabsProps {
  activeCategory: ReportCategory;
  onCategoryChange: (category: ReportCategory) => void;
  userRole?: string;
}

export function ReportCategoryTabs({ activeCategory, onCategoryChange, userRole }: ReportCategoryTabsProps) {
  const allTabs = [
    { id: 'STUDENT', label: 'Student Reports', icon: Users, roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'PARENT', 'STUDENT'] },
    { id: 'ATTENDANCE', label: 'Attendance Reports', icon: CalendarCheck, roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'PARENT', 'STUDENT'] },
    { id: 'FEE', label: 'Fee Reports', icon: Landmark, roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ACCOUNTANT', 'PARENT', 'STUDENT'] },
    { id: 'EXAM', label: 'Exam Reports', icon: GraduationCap, roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'PARENT', 'STUDENT'] },
    { id: 'TEACHER', label: 'Teacher Reports', icon: UserCheck, roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER'] },
    { id: 'FINANCIAL', label: 'Financial Reports', icon: Wallet, roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ACCOUNTANT'] },
  ];

  const visibleTabs = allTabs.filter((tab) => !userRole || tab.roles.includes(userRole));

  return (
    <div className="report-tabs flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-800 pb-3 mb-6 no-print">
      {visibleTabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeCategory === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onCategoryChange(tab.id as ReportCategory)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 cursor-pointer ${
              isActive
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-800'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
