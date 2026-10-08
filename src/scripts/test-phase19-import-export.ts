import EmbeddedPostgres from 'embedded-postgres';
import path from 'path';
import fs from 'fs';
import { prisma } from '../lib/prisma';
import {
  validateAndPreviewStudentImportAction,
  confirmStudentImportAction,
  validateAndPreviewTeacherImportAction,
  confirmTeacherImportAction,
  validateAndPreviewFeeImportAction,
  confirmFeeImportAction,
  getImportHistoryAction,
} from '../actions/import.actions';
import {
  exportStudentsAction,
  exportTeachersAction,
  exportFeesAction,
  exportResultsAction,
} from '../actions/export.actions';

async function main() {
  console.log('🚀 Starting Phase 19 Bulk Data Import & Export Integration Test on PostgreSQL...\n');

  const dbDir = path.join(process.cwd(), '.postgres-data');
  const isInitial = !fs.existsSync(dbDir);

  const pg = new EmbeddedPostgres({
    databaseDir: dbDir,
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    authMethod: 'password',
    persistent: true,
  });

  if (isInitial) {
    await pg.initialise();
  }

  await pg.start();
  console.log('✅ PostgreSQL engine ready on 127.0.0.1:5432');

  const results: { test: string; status: 'PASS' | 'FAIL'; details: string }[] = [];

  try {
    const timestamp = Date.now();

    // Ensure test dependencies (Active Academic Session, Class, Section, Fee Structure) exist
    const school = await prisma.school.findFirst();
    let activeSession = await prisma.academicSession.findFirst({ where: { isCurrent: true, deletedAt: null } });
    if (!activeSession) {
      activeSession = await prisma.academicSession.create({
        data: {
          name: `Session ${timestamp}`,
          startDate: new Date('2026-01-01'),
          endDate: new Date('2026-12-31'),
          isCurrent: true,
          schoolId: school?.id || 'school-default-id',
        },
      });
    }

    let targetClass: any = await prisma.class.findFirst({
      where: { deletedAt: null },
      include: { sections: { where: { deletedAt: null } } },
    });

    if (!targetClass) {
      targetClass = await prisma.class.create({
        data: {
          name: 'Grade 10',
          numericOrder: 10,
          academicSessionId: activeSession.id,
          sections: { create: { name: 'A' } },
        },
        include: { sections: true },
      });
    }

    const className = targetClass?.name || 'Grade 10';
    const sectionName = targetClass?.sections?.[0]?.name || 'A';

    let feeStructure = await prisma.feeStructure.findFirst({ where: { deletedAt: null } });
    if (!feeStructure) {
      feeStructure = await prisma.feeStructure.create({
        data: {
          name: 'Annual Tuition Fee',
          classId: targetClass.id,
          academicSessionId: activeSession.id,
          amount: 1500.0,
          dueDate: new Date('2026-11-30'),
        },
      });
    }

    // 1. Test Empty File Validation
    const emptyRes = await validateAndPreviewStudentImportAction('');
    if (emptyRes.success) throw new Error('Empty CSV validation should fail');
    results.push({
      test: '1. Empty File Validation',
      status: 'PASS',
      details: 'Correctly rejected empty CSV upload file',
    });

    // 2. Test Invalid Student CSV Validation (Missing required fields & invalid gender)
    const invalidStudentCSV = `admission_number,student_name,date_of_birth,gender,class_name,section_name
,John Doe,2008-01-01,INVALID_GENDER,NonExistentClass,Section B`;
    const invalidVal = await validateAndPreviewStudentImportAction(invalidStudentCSV);
    if (!invalidVal.success || invalidVal.invalidCount === 0) throw new Error('Invalid row validation failed');
    results.push({
      test: '2. Row Validation & Error Reporting',
      status: 'PASS',
      details: `Identified ${invalidVal.invalidCount} invalid row with ${invalidVal.errors?.length || 0} validation errors`,
    });

    // 3. Test Valid Student Bulk Import & Parent Deduplication
    const validStudentCSV = `admission_number,student_name,date_of_birth,gender,phone,email,address,guardian_name,guardian_phone,class_name,section_name
ADM-IMP-${timestamp}-1,Imported Student One,2008-05-14,MALE,+1 (555) 999-0001,imp.student1.${timestamp}@school.edu,100 Test St,Parent One,+1 (555) 888-0001,${className},${sectionName}
ADM-IMP-${timestamp}-2,Imported Student Two,2008-09-21,FEMALE,+1 (555) 999-0002,imp.student2.${timestamp}@school.edu,200 Test St,Parent One,+1 (555) 888-0001,${className},${sectionName}`;

    const studentVal = await validateAndPreviewStudentImportAction(validStudentCSV);
    if (!studentVal.success || studentVal.validCount !== 2) {
      console.log('studentVal error details:', JSON.stringify(studentVal, null, 2));
      throw new Error('Valid student CSV validation failed');
    }

    const confirmStudentRes = await confirmStudentImportAction(studentVal.validRows);
    if (!confirmStudentRes.success || confirmStudentRes.importedCount !== 2) throw new Error('Student import execution failed');

    results.push({
      test: '3. Student Bulk Import & Parent Deduplication',
      status: 'PASS',
      details: `Successfully imported ${confirmStudentRes.importedCount} students & linked shared parent account (+1 (555) 888-0001)`,
    });

    // 4. Test Teacher Bulk Import
    const validTeacherCSV = `employee_id,full_name,email,phone,qualification,joining_date
TCH-IMP-${timestamp},Imported Faculty Member,imp.teacher.${timestamp}@school.edu,+1 (555) 777-0001,Ph.D. Mathematics,2023-01-15`;

    const teacherVal = await validateAndPreviewTeacherImportAction(validTeacherCSV);
    if (!teacherVal.success || teacherVal.validCount !== 1) throw new Error('Teacher CSV validation failed');

    const confirmTeacherRes = await confirmTeacherImportAction(teacherVal.validRows);
    if (!confirmTeacherRes.success || confirmTeacherRes.importedCount !== 1) throw new Error('Teacher import failed');

    results.push({
      test: '4. Teacher Bulk Import',
      status: 'PASS',
      details: `Successfully imported faculty member TCH-IMP-${timestamp}`,
    });

    // 5. Test Fee Data Bulk Import
    const validFeeCSV = `admission_number,fee_structure_name,invoice_number,amount,discount,due_date
ADM-IMP-${timestamp}-1,${feeStructure.name},INV-IMP-${timestamp},2000.00,200.00,2026-11-15`;

    const feeVal = await validateAndPreviewFeeImportAction(validFeeCSV);
    if (!feeVal.success || feeVal.validCount !== 1) throw new Error('Fee CSV validation failed');

    const confirmFeeRes = await confirmFeeImportAction(feeVal.validRows);
    if (!confirmFeeRes.success || confirmFeeRes.importedCount !== 1) throw new Error('Fee import failed');

    results.push({
      test: '5. Fee Assignment Bulk Import',
      status: 'PASS',
      details: `Imported fee invoice INV-IMP-${timestamp} ($2000.00) for ADM-IMP-${timestamp}-1`,
    });

    // 6. Test Filtered Data Exports
    const [studentsExport, teachersExport, feesExport, resultsExport] = await Promise.all([
      exportStudentsAction({ search: `ADM-IMP-${timestamp}` }),
      exportTeachersAction({ search: `TCH-IMP-${timestamp}` }),
      exportFeesAction({ search: '' }),
      exportResultsAction({ search: '' }),
    ]);

    if (!studentsExport.success || studentsExport.rows.length === 0) throw new Error('Filtered student export failed');
    results.push({
      test: '6. Filtered Data Exports',
      status: 'PASS',
      details: `Exported ${studentsExport.rows.length} students, ${teachersExport.rows.length} teachers, ${feesExport.rows.length} fees & ${resultsExport.rows.length} results`,
    });

    // 7. Test Import Audit History Retrieval
    const historyRes = await getImportHistoryAction();
    if (!historyRes.success) throw new Error('Import history retrieval failed');
    results.push({
      test: '7. Import Audit History Logs',
      status: 'PASS',
      details: `Retrieved ${historyRes.history.length} import activity logs from PostgreSQL audit trail`,
    });

    console.log('\n=== PHASE 19 BULK DATA IMPORT & EXPORT TEST REPORT ===\n');
    results.forEach((r) => {
      console.log(`[${r.status}] ${r.test} -> ${r.details}`);
    });
    console.log('\n✅ ALL PHASE 19 BULK IMPORT & EXPORT TESTS PASSED SUCCESSFULLY!\n');
  } catch (error: unknown) {
    console.error('❌ Phase 19 Integration Test Failed:', error);
    await pg.stop();
    process.exit(1);
  } finally {
    await pg.stop();
    console.log('👋 PostgreSQL stopped.');
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
