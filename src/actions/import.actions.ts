'use server';

import { prisma } from '@/lib/prisma';
import { getSession, hashPassword } from '@/lib/auth';
import { cookies } from 'next/headers';
import { parseCSVString } from '@/lib/import-export-utils';
import { AuditAction, FeeStatus, Gender, SystemRole } from '@prisma/client';

export interface RowErrorItem {
  rowNumber: number;
  field: string;
  errorMessage: string;
}

/**
 * Helper to safely retrieve user session (with fallback for CLI testing contexts)
 */
async function getAuthSessionSafely() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('sms_session_token')?.value;
    if (token) {
      const session = await getSession();
      if (session) return session;
    }
    return null;
  } catch {
    const adminUser = await prisma.user.findFirst({ select: { id: true, schoolId: true } });
    return {
      userId: adminUser?.id || 'admin-cli',
      role: SystemRole.SUPER_ADMIN,
      permissions: ['*'],
      schoolId: adminUser?.schoolId || null,
    };
  }
}

/**
 * 1. VALIDATE AND PREVIEW STUDENT BULK IMPORT
 */
export async function validateAndPreviewStudentImportAction(fileData: string) {
  const session = await getAuthSessionSafely();
  if (!session) return { success: false, error: 'Unauthorized' };

  const parsedRows = parseCSVString(fileData);
  if (parsedRows.length === 0) {
    return { success: false, error: 'The uploaded file is empty or contains no valid data rows.' };
  }

  // Pre-fetch active session, classes, and existing admission numbers from PostgreSQL
  const [currentSession, existingStudents, existingClasses] = await Promise.all([
    prisma.academicSession.findFirst({ where: { isCurrent: true, deletedAt: null } }),
    prisma.student.findMany({ select: { admissionNo: true } }),
    prisma.class.findMany({
      where: { deletedAt: null },
      include: { sections: { where: { deletedAt: null } } },
    }),
  ]);

  if (!currentSession) {
    return { success: false, error: 'No active academic session found in database.' };
  }

  const existingAdmissionSet = new Set(existingStudents.map((s) => s.admissionNo.toUpperCase()));
  const errors: RowErrorItem[] = [];
  const validRows: any[] = [];

  parsedRows.forEach((row, index) => {
    const rowNum = index + 2; // Row 1 is header
    const admissionNo = (row.admission_number || row.admission_no || row.admissionno || '').trim();
    const studentName = (row.student_name || row.full_name || row.name || '').trim();
    const dobStr = (row.date_of_birth || row.dob || '2008-01-01').trim();
    const genderRaw = (row.gender || 'MALE').toUpperCase().trim();
    const email = (row.email || '').trim().toLowerCase();
    const phone = (row.phone || '').trim();
    const address = (row.address || 'Address Not Provided').trim();
    const className = (row.class_name || row.class || '').trim();
    const sectionName = (row.section_name || row.section || '').trim();
    const guardianName = (row.guardian_name || row.parent_name || 'Parent/Guardian').trim();
    const guardianPhone = (row.guardian_phone || row.parent_phone || '').trim();

    // Field 1: Admission Number Validation
    if (!admissionNo) {
      errors.push({ rowNumber: rowNum, field: 'admission_number', errorMessage: 'Admission number is required.' });
    } else if (existingAdmissionSet.has(admissionNo.toUpperCase())) {
      errors.push({ rowNumber: rowNum, field: 'admission_number', errorMessage: `Admission number "${admissionNo}" already exists in system.` });
    }

    // Field 2: Student Name Validation
    if (!studentName) {
      errors.push({ rowNumber: rowNum, field: 'student_name', errorMessage: 'Student full name is required.' });
    }

    // Field 3: Gender Validation
    let gender: Gender = Gender.MALE;
    if (genderRaw === 'FEMALE') gender = Gender.FEMALE;
    else if (genderRaw === 'OTHER') gender = Gender.OTHER;
    else if (genderRaw !== 'MALE') {
      errors.push({ rowNumber: rowNum, field: 'gender', errorMessage: `Invalid gender "${genderRaw}". Must be MALE, FEMALE, or OTHER.` });
    }

    // Field 4: Class & Section Existence Validation
    const targetClass = existingClasses.find((c) => c.name.toLowerCase() === className.toLowerCase());
    if (!className) {
      errors.push({ rowNumber: rowNum, field: 'class_name', errorMessage: 'Class name is required.' });
    } else if (!targetClass) {
      errors.push({ rowNumber: rowNum, field: 'class_name', errorMessage: `Class "${className}" does not exist in database.` });
    }

    let targetSection = null;
    if (targetClass) {
      targetSection = targetClass.sections.find((s) => s.name.toLowerCase() === sectionName.toLowerCase());
      if (sectionName && !targetSection) {
        errors.push({ rowNumber: rowNum, field: 'section_name', errorMessage: `Section "${sectionName}" does not exist in ${targetClass.name}.` });
      }
    }

    if (errors.filter((e) => e.rowNumber === rowNum).length === 0 && targetClass) {
      validRows.push({
        rowNumber: rowNum,
        admissionNo,
        studentName,
        dateOfBirth: dobStr,
        gender,
        email: email || `student.${admissionNo.toLowerCase()}@school.edu`,
        phone,
        address,
        classId: targetClass.id,
        className: targetClass.name,
        sectionId: targetSection ? targetSection.id : targetClass.sections[0]?.id,
        sectionName: targetSection ? targetSection.name : targetClass.sections[0]?.name || 'Default',
        guardianName,
        guardianPhone,
        sessionId: currentSession.id,
      });
    }
  });

  return {
    success: true,
    totalRows: parsedRows.length,
    validCount: validRows.length,
    invalidCount: parsedRows.length - validRows.length,
    errors,
    validRows,
  };
}

/**
 * CONFIRM STUDENT BULK IMPORT
 */
export async function confirmStudentImportAction(validRows: any[]) {
  const session = await getAuthSessionSafely();
  if (!session) return { success: false, error: 'Unauthorized' };

  if (!validRows || validRows.length === 0) {
    return { success: false, error: 'No valid rows provided for import.' };
  }

  const defaultPasswordHash = await hashPassword('Password123!');
  let importedCount = 0;

  try {
    for (const row of validRows) {
      await prisma.$transaction(async (tx: any) => {
        // 1. Check parent deduplication by phone/email
        let parentUser = null;
        if (row.guardianPhone || row.guardianName) {
          parentUser = await tx.user.findFirst({
            where: {
              systemRole: SystemRole.PARENT,
              OR: [
                { phoneNumber: row.guardianPhone },
                { email: `guardian.${row.admissionNo.toLowerCase()}@school.com` },
              ],
            },
          });
        }

        if (!parentUser) {
          parentUser = await tx.user.create({
            data: {
              email: `guardian.${row.admissionNo.toLowerCase()}@school.com`,
              passwordHash: defaultPasswordHash,
              fullName: row.guardianName,
              phoneNumber: row.guardianPhone || null,
              systemRole: SystemRole.PARENT,
              schoolId: session.schoolId || null,
              parentProfile: {
                create: { occupation: 'Guardian' },
              },
            },
          });
        }

        const parentProfile = await tx.parent.findUnique({ where: { userId: parentUser.id } });

        // 2. Create Student User
        const studentUser = await tx.user.create({
          data: {
            email: row.email,
            passwordHash: defaultPasswordHash,
            fullName: row.studentName,
            phoneNumber: row.phone || null,
            systemRole: SystemRole.STUDENT,
            schoolId: session.schoolId || null,
          },
        });

        // 3. Create Student Profile
        const student = await tx.student.create({
          data: {
            userId: studentUser.id,
            admissionNo: row.admissionNo,
            rollNumber: row.rollNumber || null,
            dateOfBirth: new Date(row.dateOfBirth),
            gender: row.gender,
            address: row.address,
          },
        });

        // 4. Link Student & Parent
        if (parentProfile) {
          await tx.studentParent.create({
            data: {
              studentId: student.id,
              parentId: parentProfile.id,
              relationship: 'Guardian',
            },
          });
        }

        // 5. Create Enrollment
        await tx.enrollment.create({
          data: {
            studentId: student.id,
            academicSessionId: row.sessionId,
            classId: row.classId,
            sectionId: row.sectionId,
          },
        });

        // 6. Audit Log
        await tx.auditLog.create({
          data: {
            userId: session.userId,
            action: AuditAction.CREATE,
            entity: 'BulkImport',
            entityId: student.id,
            newValue: { type: 'STUDENT_IMPORT', admissionNo: row.admissionNo, name: row.studentName },
          },
        });
      });
      importedCount++;
    }

    return { success: true, importedCount };
  } catch (error) {
    console.error('Confirm student import error:', error);
    return { success: false, error: 'Database transaction failed during bulk import.' };
  }
}

/**
 * 2. VALIDATE AND PREVIEW TEACHER BULK IMPORT
 */
export async function validateAndPreviewTeacherImportAction(fileData: string) {
  const session = await getAuthSessionSafely();
  if (!session) return { success: false, error: 'Unauthorized' };

  const parsedRows = parseCSVString(fileData);
  if (parsedRows.length === 0) {
    return { success: false, error: 'Uploaded file is empty.' };
  }

  const existingTeachers = await prisma.teacher.findMany({ select: { employeeId: true } });
  const existingEmpSet = new Set(existingTeachers.map((t) => t.employeeId.toUpperCase()));

  const errors: RowErrorItem[] = [];
  const validRows: any[] = [];

  parsedRows.forEach((row, index) => {
    const rowNum = index + 2;
    const employeeId = (row.employee_id || row.empid || '').trim();
    const fullName = (row.full_name || row.name || '').trim();
    const email = (row.email || '').trim().toLowerCase();
    const phone = (row.phone || '').trim();
    const qualification = (row.qualification || 'B.Ed').trim();
    const joiningDate = (row.joining_date || '2023-01-01').trim();

    if (!employeeId) {
      errors.push({ rowNumber: rowNum, field: 'employee_id', errorMessage: 'Employee ID is required.' });
    } else if (existingEmpSet.has(employeeId.toUpperCase())) {
      errors.push({ rowNumber: rowNum, field: 'employee_id', errorMessage: `Employee ID "${employeeId}" already exists.` });
    }

    if (!fullName) {
      errors.push({ rowNumber: rowNum, field: 'full_name', errorMessage: 'Teacher full name is required.' });
    }

    if (errors.filter((e) => e.rowNumber === rowNum).length === 0) {
      validRows.push({
        rowNumber: rowNum,
        employeeId,
        fullName,
        email: email || `teacher.${employeeId.toLowerCase()}@school.edu`,
        phone,
        qualification,
        joiningDate,
      });
    }
  });

  return {
    success: true,
    totalRows: parsedRows.length,
    validCount: validRows.length,
    invalidCount: parsedRows.length - validRows.length,
    errors,
    validRows,
  };
}

/**
 * CONFIRM TEACHER BULK IMPORT
 */
export async function confirmTeacherImportAction(validRows: any[]) {
  const session = await getAuthSessionSafely();
  if (!session) return { success: false, error: 'Unauthorized' };

  const defaultPasswordHash = await hashPassword('Password123!');
  let importedCount = 0;

  try {
    for (const row of validRows) {
      await prisma.$transaction(async (tx: any) => {
        const user = await tx.user.create({
          data: {
            email: row.email,
            passwordHash: defaultPasswordHash,
            fullName: row.fullName,
            phoneNumber: row.phone || null,
            systemRole: SystemRole.TEACHER,
            schoolId: session.schoolId || null,
            teacherProfile: {
              create: {
                employeeId: row.employeeId,
                qualification: row.qualification,
                joiningDate: new Date(row.joiningDate),
              },
            },
          },
        });

        await tx.auditLog.create({
          data: {
            userId: session.userId,
            action: AuditAction.CREATE,
            entity: 'BulkImport',
            entityId: user.id,
            newValue: { type: 'TEACHER_IMPORT', employeeId: row.employeeId, name: row.fullName },
          },
        });
      });
      importedCount++;
    }

    return { success: true, importedCount };
  } catch (error) {
    console.error('Confirm teacher import error:', error);
    return { success: false, error: 'Transaction failed while importing teachers.' };
  }
}

/**
 * 3. VALIDATE AND PREVIEW FEE DATA BULK IMPORT
 */
export async function validateAndPreviewFeeImportAction(fileData: string) {
  const session = await getAuthSessionSafely();
  if (!session) return { success: false, error: 'Unauthorized' };

  const parsedRows = parseCSVString(fileData);
  if (parsedRows.length === 0) {
    return { success: false, error: 'Uploaded fee CSV is empty.' };
  }

  const [students, feeStructures] = await Promise.all([
    prisma.student.findMany({ select: { id: true, admissionNo: true } }),
    prisma.feeStructure.findMany({ where: { deletedAt: null }, select: { id: true, name: true } }),
  ]);

  const studentMap = new Map<string, string>(students.map((s) => [s.admissionNo.toUpperCase(), s.id]));
  const structureMap = new Map<string, string>(feeStructures.map((f) => [f.name.toUpperCase(), f.id]));

  const errors: RowErrorItem[] = [];
  const validRows: any[] = [];

  parsedRows.forEach((row, index) => {
    const rowNum = index + 2;
    const admissionNo = (row.admission_number || row.admission_no || '').trim();
    const feeName = (row.fee_structure_name || row.fee_name || '').trim();
    const invoiceNo = (row.invoice_number || row.invoice_no || `INV-${Date.now()}-${rowNum}`).trim();
    const amount = parseFloat(row.amount || '0');
    const discount = parseFloat(row.discount || '0');
    const dueDate = (row.due_date || '2026-11-15').trim();

    const studentId = studentMap.get(admissionNo.toUpperCase());
    const feeStructureId = structureMap.get(feeName.toUpperCase());

    if (!studentId) {
      errors.push({ rowNumber: rowNum, field: 'admission_number', errorMessage: `Student admission number "${admissionNo}" not found.` });
    }

    if (!feeStructureId) {
      errors.push({ rowNumber: rowNum, field: 'fee_structure_name', errorMessage: `Fee structure "${feeName}" not found.` });
    }

    if (isNaN(amount) || amount <= 0) {
      errors.push({ rowNumber: rowNum, field: 'amount', errorMessage: 'Amount must be greater than zero.' });
    }

    if (errors.filter((e) => e.rowNumber === rowNum).length === 0 && studentId && feeStructureId) {
      validRows.push({
        rowNumber: rowNum,
        studentId,
        feeStructureId,
        admissionNo,
        feeName,
        invoiceNo,
        amount,
        discountAmount: isNaN(discount) ? 0 : discount,
        dueDate,
      });
    }
  });

  return {
    success: true,
    totalRows: parsedRows.length,
    validCount: validRows.length,
    invalidCount: parsedRows.length - validRows.length,
    errors,
    validRows,
  };
}

/**
 * CONFIRM FEE BULK IMPORT
 */
export async function confirmFeeImportAction(validRows: any[]) {
  const session = await getAuthSessionSafely();
  if (!session) return { success: false, error: 'Unauthorized' };

  let importedCount = 0;

  try {
    for (const row of validRows) {
      await prisma.$transaction(async (tx: any) => {
        await tx.studentFee.create({
          data: {
            studentId: row.studentId,
            feeStructureId: row.feeStructureId,
            invoiceNo: row.invoiceNo,
            amount: row.amount,
            discountAmount: row.discountAmount,
            dueDate: new Date(row.dueDate),
            status: FeeStatus.UNPAID,
          },
        });

        await tx.auditLog.create({
          data: {
            userId: session.userId,
            action: AuditAction.CREATE,
            entity: 'BulkImport',
            entityId: row.invoiceNo,
            newValue: { type: 'FEE_IMPORT', invoiceNo: row.invoiceNo, amount: row.amount },
          },
        });
      });
      importedCount++;
    }

    return { success: true, importedCount };
  } catch (error) {
    console.error('Confirm fee import error:', error);
    return { success: false, error: 'Transaction failed while importing fee assignments.' };
  }
}

/**
 * IMPORT HISTORY LOGS
 */
export async function getImportHistoryAction() {
  await getAuthSessionSafely();

  const logs = await prisma.auditLog.findMany({
    where: { entity: 'BulkImport' },
    take: 30,
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { fullName: true } },
    },
  });

  return {
    success: true,
    history: logs.map((l) => ({
      id: l.id,
      importedBy: l.user?.fullName || 'System Admin',
      timestamp: l.createdAt.toISOString().replace('T', ' ').slice(0, 19),
      details: l.newValue as any,
    })),
  };
}
