'use client';

import React, { useState } from 'react';
import { Download, Upload, CheckCircle2, AlertCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import {
  getStudentImportTemplateCSV,
  getTeacherImportTemplateCSV,
  getFeeImportTemplateCSV,
} from '@/lib/import-export-utils';
import { exportToCSV } from '@/lib/export-utils';
import {
  validateAndPreviewStudentImportAction,
  confirmStudentImportAction,
  validateAndPreviewTeacherImportAction,
  confirmTeacherImportAction,
  validateAndPreviewFeeImportAction,
  confirmFeeImportAction,
  RowErrorItem,
} from '@/actions/import.actions';
import { ImportErrorAlert } from './ImportErrorAlert';

export type ImportType = 'STUDENT' | 'TEACHER' | 'FEE';

export function ImportWizard({ onImportFinished }: { onImportFinished?: () => void }) {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [importType, setImportType] = useState<ImportType>('STUDENT');
  const [fileText, setFileText] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Validation results
  const [validationResult, setValidationResult] = useState<{
    totalRows: number;
    validCount: number;
    invalidCount: number;
    errors: RowErrorItem[];
    validRows: any[];
  }>({
    totalRows: 0,
    validCount: 0,
    invalidCount: 0,
    errors: [],
    validRows: [],
  });

  const [importedCount, setImportedCount] = useState<number>(0);

  // Step 1: Download Sample Template
  const handleDownloadTemplate = () => {
    let csv = '';
    let name = '';
    if (importType === 'STUDENT') {
      csv = getStudentImportTemplateCSV();
      name = 'student_import_template';
    } else if (importType === 'TEACHER') {
      csv = getTeacherImportTemplateCSV();
      name = 'teacher_import_template';
    } else {
      csv = getFeeImportTemplateCSV();
      name = 'fee_import_template';
    }

    const rows = csv.split('\n').map((line) => {
      const parts = line.split(',');
      const obj: Record<string, string> = {};
      parts.forEach((p, idx) => (obj[`col_${idx}`] = p.replace(/"/g, '')));
      return obj;
    });

    exportToCSV(name, rows);
  };

  // Step 2: File Upload Handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      setFileText(content || '');
    };
    reader.readAsText(file);
  };

  // Step 3: Run Server-Side Validation
  const handleValidateFile = async () => {
    if (!fileText) return;
    setIsLoading(true);

    let res: any = { success: false };
    if (importType === 'STUDENT') {
      res = await validateAndPreviewStudentImportAction(fileText);
    } else if (importType === 'TEACHER') {
      res = await validateAndPreviewTeacherImportAction(fileText);
    } else {
      res = await validateAndPreviewFeeImportAction(fileText);
    }

    if (res.success) {
      setValidationResult({
        totalRows: res.totalRows,
        validCount: res.validCount,
        invalidCount: res.invalidCount,
        errors: res.errors || [],
        validRows: res.validRows || [],
      });
      setCurrentStep(3);
    }
    setIsLoading(false);
  };

  // Step 5: Confirm Import
  const handleConfirmImport = async () => {
    if (validationResult.validRows.length === 0) return;
    setIsLoading(true);

    let res: any = { success: false };
    if (importType === 'STUDENT') {
      res = await confirmStudentImportAction(validationResult.validRows);
    } else if (importType === 'TEACHER') {
      res = await confirmTeacherImportAction(validationResult.validRows);
    } else {
      res = await confirmFeeImportAction(validationResult.validRows);
    }

    if (res.success) {
      setImportedCount(res.importedCount || 0);
      setCurrentStep(6);
      if (onImportFinished) onImportFinished();
    }
    setIsLoading(false);
  };

  const steps = [
    { num: 1, label: 'Select & Template' },
    { num: 2, label: 'Upload File' },
    { num: 3, label: 'Validate' },
    { num: 4, label: 'Preview' },
    { num: 5, label: 'Confirm' },
    { num: 6, label: 'Complete' },
  ];

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-xs mb-6">
      {/* Wizard Progress Bar */}
      <div className="flex items-center justify-between mb-8 overflow-x-auto pb-2">
        {steps.map((s) => (
          <div key={s.num} className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                currentStep === s.num
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-2 ring-indigo-300'
                  : currentStep > s.num
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
              }`}
            >
              {currentStep > s.num ? <CheckCircle2 className="w-4 h-4" /> : s.num}
            </div>
            <span
              className={`text-xs font-medium whitespace-nowrap ${
                currentStep === s.num ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-gray-500'
              }`}
            >
              {s.label}
            </span>
            {s.num < 6 && <div className="w-6 sm:w-12 h-0.5 bg-gray-200 dark:bg-gray-800 mx-1" />}
          </div>
        ))}
      </div>

      {/* STEP 1: Select Entity & Download Template */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <div>
            <h3 className="font-bold text-base text-gray-900 dark:text-gray-100 mb-1">
              Step 1: Select Import Category & Download Template
            </h3>
            <p className="text-xs text-gray-500">
              Choose the entity type you wish to bulk import and download a pre-formatted sample CSV template.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              onClick={() => setImportType('STUDENT')}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                importType === 'STUDENT'
                  ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 font-bold'
                  : 'border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300'
              }`}
            >
              <h4 className="text-xs font-bold mb-1">Student Enrollment</h4>
              <p className="text-[11px] text-gray-500 font-normal">Import student profiles, admission numbers & parent links.</p>
            </button>

            <button
              onClick={() => setImportType('TEACHER')}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                importType === 'TEACHER'
                  ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 font-bold'
                  : 'border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300'
              }`}
            >
              <h4 className="text-xs font-bold mb-1">Faculty Members</h4>
              <p className="text-[11px] text-gray-500 font-normal">Import teacher accounts, employee IDs & qualifications.</p>
            </button>

            <button
              onClick={() => setImportType('FEE')}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                importType === 'FEE'
                  ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 font-bold'
                  : 'border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300'
              }`}
            >
              <h4 className="text-xs font-bold mb-1">Fee Invoices</h4>
              <p className="text-[11px] text-gray-500 font-normal">Bulk assign fee structures and invoice amounts to students.</p>
            </button>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={handleDownloadTemplate}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-gray-800 dark:text-gray-200 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
            >
              <Download className="w-4 h-4 text-indigo-600" />
              <span>Download Sample CSV Template</span>
            </button>

            <button
              onClick={() => setCurrentStep(2)}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-xs"
            >
              <span>Next: Upload File</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Upload File */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <div>
            <h3 className="font-bold text-base text-gray-900 dark:text-gray-100 mb-1">
              Step 2: Upload CSV / XLSX Data File
            </h3>
            <p className="text-xs text-gray-500">
              Select your populated spreadsheet file to begin server-side row validation.
            </p>
          </div>

          <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl p-8 text-center bg-gray-50/50 dark:bg-gray-800/30">
            <Upload className="w-10 h-10 text-indigo-500 mx-auto mb-3" />
            <input
              type="file"
              accept=".csv, .txt, .tsv"
              onChange={handleFileChange}
              className="hidden"
              id="bulk-file-upload"
            />
            <label
              htmlFor="bulk-file-upload"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-xs"
            >
              <span>Choose Spreadsheet File</span>
            </label>
            {fileName && (
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-3">
                Selected File: {fileName} ({fileText.length} bytes read)
              </p>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={() => setCurrentStep(1)}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <button
              onClick={handleValidateFile}
              disabled={!fileText || isLoading}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-xs"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <span>Validate File</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3 & 4: Validation Summary & Row-by-Row Error Display */}
      {currentStep === 3 && (
        <div className="space-y-6">
          <div>
            <h3 className="font-bold text-base text-gray-900 dark:text-gray-100 mb-1">
              Step 3: Server Validation Results
            </h3>
            <p className="text-xs text-gray-500">
              Validated all spreadsheet rows against PostgreSQL database constraints and business rules.
            </p>
          </div>

          {/* Validation Stats Bar */}
          <div className="grid grid-cols-3 gap-4 text-center text-xs">
            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border border-gray-200 dark:border-gray-700">
              <p className="text-gray-500 font-medium">Total Rows Evaluated</p>
              <p className="font-bold text-gray-900 dark:text-gray-100 text-lg">{validationResult.totalRows}</p>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-xl border border-emerald-200 dark:border-emerald-900">
              <p className="text-emerald-700 font-medium">Valid Rows Ready</p>
              <p className="font-bold text-emerald-600 text-lg">{validationResult.validCount}</p>
            </div>
            <div className="bg-rose-50 dark:bg-rose-950/40 p-3 rounded-xl border border-rose-200 dark:border-rose-900">
              <p className="text-rose-700 font-medium">Row Errors</p>
              <p className="font-bold text-rose-600 text-lg">{validationResult.invalidCount}</p>
            </div>
          </div>

          {/* Error Alert Table */}
          <ImportErrorAlert errors={validationResult.errors} invalidCount={validationResult.invalidCount} />

          <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={() => setCurrentStep(2)}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Upload Corrected File</span>
            </button>

            <button
              onClick={() => setCurrentStep(4)}
              disabled={validationResult.validCount === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-xs"
            >
              <span>Preview {validationResult.validCount} Valid Rows</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Preview Valid Rows */}
      {currentStep === 4 && (
        <div className="space-y-6">
          <div>
            <h3 className="font-bold text-base text-gray-900 dark:text-gray-100 mb-1">
              Step 4: Preview Valid Records Before Database Import
            </h3>
            <p className="text-xs text-gray-500">
              Review valid records that will be written atomically to PostgreSQL.
            </p>
          </div>

          <div className="max-h-64 overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-gray-800 font-semibold text-gray-700 dark:text-gray-300">
                <tr>
                  <th className="p-2.5">Row #</th>
                  <th className="p-2.5">Identifier</th>
                  <th className="p-2.5">Full Name</th>
                  <th className="p-2.5">Class / Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {validationResult.validRows.map((r, idx) => (
                  <tr key={idx}>
                    <td className="p-2.5 font-mono text-gray-500">Row {r.rowNumber}</td>
                    <td className="p-2.5 font-bold text-gray-900 dark:text-gray-100">{r.admissionNo || r.employeeId || r.invoiceNo}</td>
                    <td className="p-2.5 font-medium">{r.studentName || r.fullName || r.feeName}</td>
                    <td className="p-2.5 text-gray-600">{r.className ? `${r.className} (${r.sectionName})` : r.qualification || `$${r.amount}`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={() => setCurrentStep(3)}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <button
              onClick={() => setCurrentStep(5)}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-xs"
            >
              <span>Proceed to Confirmation</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: Confirm Import */}
      {currentStep === 5 && (
        <div className="space-y-6">
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-5 rounded-2xl">
            <h3 className="font-bold text-base text-amber-900 dark:text-amber-200 mb-1 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              Step 5: Confirm Database Import
            </h3>
            <p className="text-xs text-amber-800 dark:text-amber-300 mt-1">
              You are about to insert <span className="font-bold">{validationResult.validCount} valid records</span> into PostgreSQL database. This will create student/teacher user accounts, linked parent profiles, and enrollment records.
            </p>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={() => setCurrentStep(4)}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <button
              onClick={handleConfirmImport}
              disabled={isLoading}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-md shadow-emerald-600/20"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Execute PostgreSQL Import</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 6: Import Complete */}
      {currentStep === 6 && (
        <div className="text-center py-8 space-y-4">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-2 shadow-inner">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            Bulk Import Completed Successfully!
          </h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            Successfully created and verified <span className="font-bold text-gray-900 dark:text-gray-100">{importedCount} records</span> in PostgreSQL database. Audit logs have been updated.
          </p>

          <button
            onClick={() => {
              setCurrentStep(1);
              setFileText('');
              setFileName('');
              setValidationResult({ totalRows: 0, validCount: 0, invalidCount: 0, errors: [], validRows: [] });
            }}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
          >
            Start New Bulk Import
          </button>
        </div>
      )}
    </div>
  );
}
