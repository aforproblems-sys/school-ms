'use client';

import React, { useState, useEffect } from 'react';
import { Download, FileSpreadsheet, Filter, Search } from 'lucide-react';
import { getReportFilterOptionsAction } from '@/actions/report.actions';
import { exportToCSV, exportToExcel } from '@/lib/export-utils';
import {
  exportStudentsAction,
  exportParentsAction,
  exportTeachersAction,
  exportAttendanceAction,
  exportFeesAction,
  exportPaymentsAction,
  exportExpensesAction,
  exportResultsAction,
  exportHomeworkAction,
  exportTimetableAction,
} from '@/actions/export.actions';

export type ExportDomain =
  | 'STUDENTS'
  | 'PARENTS'
  | 'TEACHERS'
  | 'ATTENDANCE'
  | 'FEES'
  | 'PAYMENTS'
  | 'EXPENSES'
  | 'RESULTS'
  | 'HOMEWORK'
  | 'TIMETABLE';

export function ExportManager() {
  const [selectedDomain, setSelectedDomain] = useState<ExportDomain>('STUDENTS');
  const [filters, setFilters] = useState<any>({
    classId: '',
    sectionId: '',
    sessionId: '',
    startDate: '',
    endDate: '',
    search: '',
  });

  const [filterOptions, setFilterOptions] = useState<{
    sessions: { id: string; name: string }[];
    classes: { id: string; name: string }[];
    sections: { id: string; name: string; classId: string }[];
  }>({
    sessions: [],
    classes: [],
    sections: [],
  });

  const [isExporting, setIsExporting] = useState<boolean>(false);

  useEffect(() => {
    getReportFilterOptionsAction().then((res) => {
      if (res.success && res.filterOptions) {
        setFilterOptions({
          sessions: res.filterOptions.sessions || [],
          classes: res.filterOptions.classes || [],
          sections: res.filterOptions.sections || [],
        });
      }
    });
  }, []);

  const handleExport = async (format: 'CSV' | 'EXCEL') => {
    setIsExporting(true);
    let res: any = { success: false, rows: [] };

    switch (selectedDomain) {
      case 'STUDENTS':
        res = await exportStudentsAction(filters);
        break;
      case 'PARENTS':
        res = await exportParentsAction(filters);
        break;
      case 'TEACHERS':
        res = await exportTeachersAction(filters);
        break;
      case 'ATTENDANCE':
        res = await exportAttendanceAction(filters);
        break;
      case 'FEES':
        res = await exportFeesAction(filters);
        break;
      case 'PAYMENTS':
        res = await exportPaymentsAction(filters);
        break;
      case 'EXPENSES':
        res = await exportExpensesAction(filters);
        break;
      case 'RESULTS':
        res = await exportResultsAction(filters);
        break;
      case 'HOMEWORK':
        res = await exportHomeworkAction(filters);
        break;
      case 'TIMETABLE':
        res = await exportTimetableAction(filters);
        break;
    }

    if (res.success && res.rows) {
      const filename = `${selectedDomain.toLowerCase()}_export_${Date.now()}`;
      if (format === 'CSV') {
        exportToCSV(filename, res.rows);
      } else {
        exportToExcel(filename, res.rows);
      }
    }
    setIsExporting(false);
  };

  const domainList: { id: ExportDomain; label: string }[] = [
    { id: 'STUDENTS', label: 'Students Roster' },
    { id: 'PARENTS', label: 'Parents Directory' },
    { id: 'TEACHERS', label: 'Faculty & Teachers' },
    { id: 'ATTENDANCE', label: 'Attendance Records' },
    { id: 'FEES', label: 'Fee Structures & Invoices' },
    { id: 'PAYMENTS', label: 'Fee Payments' },
    { id: 'EXPENSES', label: 'School Expenses' },
    { id: 'RESULTS', label: 'Examination Results' },
    { id: 'HOMEWORK', label: 'Homework Assignments' },
    { id: 'TIMETABLE', label: 'Class Timetables' },
  ];

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-xs">
      <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-3 mb-6">
        <Download className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        <h2 className="font-bold text-base text-gray-900 dark:text-gray-100">
          Filtered Data Export Manager
        </h2>
      </div>

      {/* Domain Selection Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {domainList.map((d) => (
          <button
            key={d.id}
            onClick={() => setSelectedDomain(d.id)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              selectedDomain === d.id
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>

      {/* Export Parameter Filters */}
      <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-200 dark:border-gray-800 mb-6">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3">
          <Filter className="w-3.5 h-3.5 text-indigo-500" />
          <span>Export Scope Filters</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Class Grade
            </label>
            <select
              value={filters.classId || ''}
              onChange={(e) => setFilters((p: any) => ({ ...p, classId: e.target.value }))}
              className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-gray-100"
            >
              <option value="">All Classes</option>
              {filterOptions.classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={filters.startDate || ''}
              onChange={(e) => setFilters((p: any) => ({ ...p, startDate: e.target.value }))}
              className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={filters.endDate || ''}
              onChange={(e) => setFilters((p: any) => ({ ...p, endDate: e.target.value }))}
              className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Keyword Filter
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search name, ID..."
                value={filters.search || ''}
                onChange={(e) => setFilters((p: any) => ({ ...p, search: e.target.value }))}
                className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl pl-8 pr-3 py-2 text-xs text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Export Action Triggers */}
      <div className="flex items-center justify-end gap-3">
        <button
          onClick={() => handleExport('CSV')}
          disabled={isExporting}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
        >
          <Download className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          <span>Export Filtered CSV</span>
        </button>

        <button
          onClick={() => handleExport('EXCEL')}
          disabled={isExporting}
          className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer transition-colors"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Export Filtered Excel</span>
        </button>
      </div>
    </div>
  );
}
