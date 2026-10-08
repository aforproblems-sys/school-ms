'use client';

import React from 'react';
import { Search, Filter, X } from 'lucide-react';
import { ReportCategory } from './ReportCategoryTabs';

export interface FilterOptionsData {
  sessions: { id: string; name: string; isCurrent: boolean }[];
  classes: { id: string; name: string; numericOrder: number }[];
  sections: { id: string; name: string; classId: string }[];
  subjects: { id: string; name: string; code: string; classId: string }[];
  students: { id: string; name: string }[];
  teachers: { id: string; name: string }[];
}

interface ReportFilterBarProps {
  category: ReportCategory;
  filters: Record<string, string | number | undefined>;
  filterOptions: FilterOptionsData;
  onFilterChange: (key: string, value: string | number) => void;
  onResetFilters: () => void;
}

export function ReportFilterBar({
  category,
  filters,
  filterOptions,
  onFilterChange,
  onResetFilters,
}: ReportFilterBarProps) {
  // Define category specific sub-report options
  const subReportOptions: Record<ReportCategory, { value: string; label: string }[]> = {
    STUDENT: [
      { value: 'ALL', label: 'Complete Student List' },
      { value: 'CLASS_WISE', label: 'Class-Wise Enrollment' },
      { value: 'NEW_ADMISSIONS', label: 'New Admissions' },
      { value: 'WITHDRAWN', label: 'Withdrawn / Inactive Students' },
    ],
    ATTENDANCE: [
      { value: 'DAILY', label: 'Daily Attendance Report' },
      { value: 'RANGE', label: 'Date-Range Summary' },
      { value: 'CLASS_ATTENDANCE', label: 'Class/Section Percentage' },
      { value: 'LOW_ATTENDANCE', label: 'Low Attendance Alert (<75%)' },
    ],
    FEE: [
      { value: 'ALL', label: 'All Fee Records' },
      { value: 'PAID', label: 'Fully Paid Receipts' },
      { value: 'PENDING', label: 'Pending Fee Statements' },
      { value: 'PARTIAL', label: 'Partially Paid Balances' },
    ],
    EXAM: [
      { value: 'ALL', label: 'All Exam Results' },
      { value: 'TOP_PERFORMERS', label: 'Top Performing Students' },
      { value: 'ACADEMIC_ATTENTION', label: 'Students Requiring Attention' },
    ],
    TEACHER: [
      { value: 'ALL', label: 'Faculty Roster' },
      { value: 'WORKLOAD', label: 'Teacher Workload Summary' },
    ],
    FINANCIAL: [
      { value: 'ALL', label: 'Complete Revenue & Expense Ledger' },
      { value: 'REVENUE', label: 'Fee Revenue Collection' },
      { value: 'EXPENSES', label: 'Operational Expenses' },
    ],
  };

  const filteredSections = filters.classId
    ? filterOptions.sections.filter((s) => s.classId === filters.classId)
    : filterOptions.sections;

  const filteredSubjects = filters.classId
    ? filterOptions.subjects.filter((s) => s.classId === filters.classId)
    : filterOptions.subjects;

  return (
    <div className="filter-bar bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 mb-6 shadow-xs no-print">
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
            Report Parameters & Controls
          </h3>
        </div>
        <button
          onClick={onResetFilters}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
          Reset Parameters
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Sub Report Type Dropdown */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Report Type
          </label>
          <select
            value={filters.reportType || 'ALL'}
            onChange={(e) => onFilterChange('reportType', e.target.value)}
            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500"
          >
            {(subReportOptions[category] || []).map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Academic Session */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Academic Session
          </label>
          <select
            value={filters.sessionId || ''}
            onChange={(e) => onFilterChange('sessionId', e.target.value)}
            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Academic Sessions</option>
            {filterOptions.sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} {s.isCurrent ? '(Current)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Class Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Class Grade
          </label>
          <select
            value={filters.classId || ''}
            onChange={(e) => {
              onFilterChange('classId', e.target.value);
              onFilterChange('sectionId', '');
            }}
            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Classes</option>
            {filterOptions.classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Section Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Section
          </label>
          <select
            value={filters.sectionId || ''}
            onChange={(e) => onFilterChange('sectionId', e.target.value)}
            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Sections</option>
            {filteredSections.map((sec) => (
              <option key={sec.id} value={sec.id}>
                {sec.name}
              </option>
            ))}
          </select>
        </div>

        {/* Subject Filter (Shown for EXAM & TEACHER) */}
        {['EXAM', 'TEACHER'].includes(category) && (
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Subject
            </label>
            <select
              value={filters.subjectId || ''}
              onChange={(e) => onFilterChange('subjectId', e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Subjects</option>
              {filteredSubjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name} ({sub.code})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Start Date */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Start Date
          </label>
          <div className="relative">
            <input
              type="date"
              value={filters.startDate || ''}
              onChange={(e) => onFilterChange('startDate', e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* End Date */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            End Date
          </label>
          <div className="relative">
            <input
              type="date"
              value={filters.endDate || ''}
              onChange={(e) => onFilterChange('endDate', e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Instant Search Bar */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Search Terms
          </label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Name, ID, Roll, Invoice..."
              value={filters.search || ''}
              onChange={(e) => onFilterChange('search', e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl pl-8 pr-3 py-2 text-xs text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
