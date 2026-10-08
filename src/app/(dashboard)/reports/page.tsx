'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ReportCategoryTabs, ReportCategory } from '@/components/reports/ReportCategoryTabs';
import { ReportFilterBar, FilterOptionsData } from '@/components/reports/ReportFilterBar';
import { ReportSummaryCards } from '@/components/reports/ReportSummaryCards';
import { ReportCharts } from '@/components/reports/ReportCharts';
import { ReportDataTable } from '@/components/reports/ReportDataTable';
import { ReportExportButtons } from '@/components/reports/ReportExportButtons';
import {
  getReportFilterOptionsAction,
  getStudentReportAction,
  getAttendanceReportAction,
  getFeeReportAction,
  getExamReportAction,
  getTeacherReportAction,
  getFinancialReportAction,
} from '@/actions/report.actions';

export default function ReportsPage() {
  const [activeCategory, setActiveCategory] = useState<ReportCategory>('STUDENT');
  const [filters, setFilters] = useState<any>({
    reportType: 'ALL',
    sessionId: '',
    classId: '',
    sectionId: '',
    subjectId: '',
    startDate: '',
    endDate: '',
    search: '',
    page: 1,
  });

  const [filterOptions, setFilterOptions] = useState<FilterOptionsData>({
    sessions: [],
    classes: [],
    sections: [],
    subjects: [],
    students: [],
    teachers: [],
  });

  const [reportData, setReportData] = useState<{
    summaryCards: any[];
    chartData: any[];
    rows: any[];
    total: number;
    page: number;
    totalPages: number;
  }>({
    summaryCards: [],
    chartData: [],
    rows: [],
    total: 0,
    page: 1,
    totalPages: 1,
  });

  const [isLoading, setIsLoading] = useState(true);

  // Load dropdown options on mount
  useEffect(() => {
    getReportFilterOptionsAction().then((res) => {
      if (res.success) {
        setFilterOptions(res.filterOptions);
      }
    });
  }, []);

  // Main data fetching function
  const fetchReportData = useCallback(async () => {
    setIsLoading(true);
    const params = {
      category: activeCategory,
      ...filters,
    };

    let res: any = { success: false };

    switch (activeCategory) {
      case 'STUDENT':
        res = await getStudentReportAction(params);
        break;
      case 'ATTENDANCE':
        res = await getAttendanceReportAction(params);
        break;
      case 'FEE':
        res = await getFeeReportAction(params);
        break;
      case 'EXAM':
        res = await getExamReportAction(params);
        break;
      case 'TEACHER':
        res = await getTeacherReportAction(params);
        break;
      case 'FINANCIAL':
        res = await getFinancialReportAction(params);
        break;
    }

    if (res.success) {
      setReportData({
        summaryCards: res.summaryCards || [],
        chartData: res.chartData || [],
        rows: res.rows || [],
        total: res.total || 0,
        page: res.page || 1,
        totalPages: res.totalPages || 1,
      });
    }
    setIsLoading(false);
  }, [activeCategory, filters]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  const handleCategoryChange = (category: ReportCategory) => {
    setActiveCategory(category);
    setFilters({
      reportType: 'ALL',
      sessionId: '',
      classId: '',
      sectionId: '',
      subjectId: '',
      startDate: '',
      endDate: '',
      search: '',
      page: 1,
    });
  };

  const handleFilterChange = (key: string, value: any) => {
    setFilters((prev: any) => ({
      ...prev,
      [key]: value,
      page: key === 'page' ? value : 1, // Reset page when parameter changes
    }));
  };

  const handleResetFilters = () => {
    setFilters({
      reportType: 'ALL',
      sessionId: '',
      classId: '',
      sectionId: '',
      subjectId: '',
      startDate: '',
      endDate: '',
      search: '',
      page: 1,
    });
  };

  const categoryTitles: Record<ReportCategory, string> = {
    STUDENT: 'Student Enrollment & Demographic Analytics',
    ATTENDANCE: 'Attendance Analytics & Absentees Report',
    FEE: 'Fee Collection Ledger & Outstanding Balances',
    EXAM: 'Academic Examination & Result Performance',
    TEACHER: 'Faculty Workload & Class Assignments',
    FINANCIAL: 'Institutional Financial Revenue & Expense Statement',
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 no-print">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            Reports & Analytics Hub
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Real-time server-side analytics, demographics, operations, and financial auditing.
          </p>
        </div>

        <ReportExportButtons reportTitle={categoryTitles[activeCategory]} rows={reportData.rows} />
      </div>

      {/* Category Tabs */}
      <ReportCategoryTabs activeCategory={activeCategory} onCategoryChange={handleCategoryChange} />

      {/* Filter Parameters Controls */}
      <ReportFilterBar
        category={activeCategory}
        filters={filters}
        filterOptions={filterOptions}
        onFilterChange={handleFilterChange}
        onResetFilters={handleResetFilters}
      />

      {/* Metric Aggregate Summary Cards */}
      <ReportSummaryCards cards={reportData.summaryCards} />

      {/* Interactive Visualizations */}
      {reportData.chartData && reportData.chartData.length > 0 && (
        <ReportCharts
          data={reportData.chartData}
          type={activeCategory === 'STUDENT' || activeCategory === 'ATTENDANCE' ? 'pie' : 'bar'}
          title={`${categoryTitles[activeCategory]} (Visual Insights)`}
        />
      )}

      {/* Server Paginated Data Table */}
      <ReportDataTable
        reportTitle={categoryTitles[activeCategory]}
        rows={reportData.rows}
        total={reportData.total}
        page={reportData.page}
        totalPages={reportData.totalPages}
        onPageChange={(p) => handleFilterChange('page', p)}
        isLoading={isLoading}
      />
    </div>
  );
}
