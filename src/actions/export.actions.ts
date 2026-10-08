'use server';

import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth';

export interface ExportFilterParams {
  classId?: string;
  sectionId?: string;
  sessionId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

/**
 * 1. EXPORT STUDENTS
 */
export async function exportStudentsAction(params: ExportFilterParams) {
  await requirePermission('students.read');
  const where: any = { deletedAt: null };

  if (params.search) {
    const term = params.search.trim();
    where.OR = [
      { user: { fullName: { contains: term, mode: 'insensitive' } } },
      { admissionNo: { contains: term, mode: 'insensitive' } },
    ];
  }

  if (params.classId || params.sectionId || params.sessionId) {
    where.enrollments = {
      some: {
        ...(params.classId && { classId: params.classId }),
        ...(params.sectionId && { sectionId: params.sectionId }),
        ...(params.sessionId && { academicSessionId: params.sessionId }),
        deletedAt: null,
      },
    };
  }

  const students = await prisma.student.findMany({
    where,
    take: 2000,
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { fullName: true, email: true, phoneNumber: true, isActive: true } },
      enrollments: {
        take: 1,
        include: { class: { select: { name: true } }, section: { select: { name: true } } },
      },
    },
  });

  return {
    success: true,
    rows: students.map((s) => ({
      Admission_No: s.admissionNo,
      Full_Name: s.user.fullName,
      Email: s.user.email,
      Phone: s.user.phoneNumber || 'N/A',
      Gender: s.gender,
      Class: s.enrollments[0]?.class.name || 'Unassigned',
      Section: s.enrollments[0]?.section.name || 'Unassigned',
      Roll_No: s.rollNumber || 'N/A',
      Address: s.address,
      Status: s.user.isActive ? 'Active' : 'Inactive',
    })),
  };
}

/**
 * 2. EXPORT PARENTS
 */
export async function exportParentsAction(params: ExportFilterParams) {
  await requirePermission('parents.read');
  const where: any = { deletedAt: null };

  if (params.search) {
    where.user = { fullName: { contains: params.search.trim(), mode: 'insensitive' } };
  }

  const parents = await prisma.parent.findMany({
    where,
    take: 2000,
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { fullName: true, email: true, phoneNumber: true } },
      students: {
        include: { student: { include: { user: { select: { fullName: true } } } } },
      },
    },
  });

  return {
    success: true,
    rows: parents.map((p) => ({
      Parent_Name: p.user.fullName,
      Email: p.user.email,
      Phone: p.user.phoneNumber || 'N/A',
      Occupation: p.occupation || 'N/A',
      Linked_Children: p.students.map((s) => s.student.user.fullName).join('; ') || 'None',
    })),
  };
}

/**
 * 3. EXPORT TEACHERS
 */
export async function exportTeachersAction(params: ExportFilterParams) {
  await requirePermission('teachers.read');
  const where: any = { deletedAt: null };

  if (params.search) {
    where.OR = [
      { user: { fullName: { contains: params.search.trim(), mode: 'insensitive' } } },
      { employeeId: { contains: params.search.trim(), mode: 'insensitive' } },
    ];
  }

  const teachers = await prisma.teacher.findMany({
    where,
    take: 2000,
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { fullName: true, email: true, phoneNumber: true, isActive: true } },
      teacherSubjects: {
        include: { subject: { select: { name: true } } },
      },
    },
  });

  return {
    success: true,
    rows: teachers.map((t) => ({
      Employee_ID: t.employeeId,
      Full_Name: t.user.fullName,
      Email: t.user.email,
      Phone: t.user.phoneNumber || 'N/A',
      Qualification: t.qualification,
      Joining_Date: t.joiningDate.toISOString().split('T')[0],
      Assigned_Subjects: t.teacherSubjects.map((ts) => ts.subject.name).join('; ') || 'None',
      Status: t.user.isActive ? 'Active' : 'Inactive',
    })),
  };
}

/**
 * 4. EXPORT ATTENDANCE
 */
export async function exportAttendanceAction(params: ExportFilterParams) {
  await requirePermission('attendance.read');
  const where: any = {};

  if (params.startDate && params.endDate) {
    where.date = {
      gte: new Date(params.startDate),
      lte: new Date(params.endDate),
    };
  }

  if (params.sectionId) {
    where.sectionId = params.sectionId;
  } else if (params.classId) {
    where.section = { classId: params.classId };
  }

  const attendances = await prisma.attendance.findMany({
    where,
    take: 2000,
    orderBy: { date: 'desc' },
    include: {
      section: { include: { class: { select: { name: true } } } },
      records: {
        include: { student: { include: { user: { select: { fullName: true } } } } },
      },
    },
  });

  const exportRows: any[] = [];
  attendances.forEach((a) => {
    a.records.forEach((r) => {
      exportRows.push({
        Date: a.date.toISOString().split('T')[0],
        Class: a.section.class.name,
        Section: a.section.name,
        Admission_No: r.student.admissionNo,
        Student_Name: r.student.user.fullName,
        Attendance_Status: r.status,
        Remarks: r.remarks || '-',
      });
    });
  });

  return { success: true, rows: exportRows };
}

/**
 * 5. EXPORT FEES
 */
export async function exportFeesAction(params: ExportFilterParams) {
  await requirePermission('fees.read');
  const where: any = { deletedAt: null };

  if (params.classId) {
    where.feeStructure = { classId: params.classId };
  }

  const fees = await prisma.studentFee.findMany({
    where,
    take: 2000,
    orderBy: { createdAt: 'desc' },
    include: {
      student: { include: { user: { select: { fullName: true } } } },
      feeStructure: { select: { name: true } },
    },
  });

  return {
    success: true,
    rows: fees.map((f) => ({
      Invoice_No: f.invoiceNo,
      Admission_No: f.student.admissionNo,
      Student_Name: f.student.user.fullName,
      Fee_Structure: f.feeStructure.name,
      Invoiced_Amount: Number(f.amount),
      Discount_Amount: Number(f.discountAmount),
      Paid_Amount: Number(f.paidAmount),
      Remaining_Balance: Math.max(0, Number(f.amount) - Number(f.paidAmount)),
      Status: f.status,
      Due_Date: f.dueDate.toISOString().split('T')[0],
    })),
  };
}

/**
 * 6. EXPORT PAYMENTS
 */
export async function exportPaymentsAction(params: ExportFilterParams) {
  await requirePermission('fees.read');
  const where: any = {};

  if (params.startDate && params.endDate) {
    where.paymentDate = {
      gte: new Date(params.startDate),
      lte: new Date(params.endDate),
    };
  }

  const payments = await prisma.feePayment.findMany({
    where,
    take: 2000,
    orderBy: { paymentDate: 'desc' },
    include: {
      studentFee: {
        include: { student: { include: { user: { select: { fullName: true } } } } },
      },
    },
  });

  return {
    success: true,
    rows: payments.map((p) => ({
      Transaction_Ref: p.transactionRef,
      Payment_Date: p.paymentDate.toISOString().split('T')[0],
      Invoice_No: p.studentFee.invoiceNo,
      Student_Name: p.studentFee.student.user.fullName,
      Amount_Paid: Number(p.amount),
      Payment_Method: p.paymentMethod,
      Recorded_By: p.receivedBy || 'System',
    })),
  };
}

/**
 * 7. EXPORT EXPENSES
 */
export async function exportExpensesAction(params: ExportFilterParams) {
  await requirePermission('expenses.read');
  const where: any = { deletedAt: null };

  if (params.startDate && params.endDate) {
    where.expenseDate = {
      gte: new Date(params.startDate),
      lte: new Date(params.endDate),
    };
  }

  const expenses = await prisma.expense.findMany({
    where,
    take: 2000,
    orderBy: { expenseDate: 'desc' },
  });

  return {
    success: true,
    rows: expenses.map((e) => ({
      Title: e.title,
      Category: e.category,
      Amount: Number(e.amount),
      Expense_Date: e.expenseDate.toISOString().split('T')[0],
      Recorded_By: e.recordedBy,
    })),
  };
}

/**
 * 8. EXPORT RESULTS
 */
export async function exportResultsAction(params: ExportFilterParams) {
  await requirePermission('results.read');
  const where: any = {};

  if (params.classId) {
    where.examSubject = { subject: { classId: params.classId } };
  }

  const results = await prisma.examResult.findMany({
    where,
    take: 2000,
    orderBy: { marksObtained: 'desc' },
    include: {
      student: { include: { user: { select: { fullName: true } } } },
      examSubject: {
        include: {
          exam: { select: { name: true } },
          subject: { select: { name: true, code: true } },
        },
      },
    },
  });

  return {
    success: true,
    rows: results.map((r) => ({
      Exam_Name: r.examSubject.exam.name,
      Admission_No: r.student.admissionNo,
      Student_Name: r.student.user.fullName,
      Subject_Code: r.examSubject.subject.code,
      Subject_Title: r.examSubject.subject.name,
      Marks_Obtained: r.marksObtained,
      Max_Marks: r.examSubject.maxMarks,
      Passing_Marks: r.examSubject.passingMarks,
      Grade: r.grade || 'N/A',
      Result_Status: r.marksObtained >= r.examSubject.passingMarks ? 'PASS' : 'FAIL',
    })),
  };
}

/**
 * 9. EXPORT HOMEWORK
 */
export async function exportHomeworkAction(params: ExportFilterParams) {
  await requirePermission('homework.read');
  const where: any = { deletedAt: null };

  const homeworks = await prisma.homework.findMany({
    where,
    take: 2000,
    orderBy: { dueDate: 'desc' },
    include: {
      subject: { select: { name: true, code: true } },
      teacher: { include: { user: { select: { fullName: true } } } },
    },
  });

  return {
    success: true,
    rows: homeworks.map((h) => ({
      Title: h.title,
      Subject: `${h.subject.name} (${h.subject.code})`,
      Assigned_Teacher: h.teacher.user.fullName,
      Due_Date: h.dueDate.toISOString().split('T')[0],
      Description: h.description,
    })),
  };
}

/**
 * 10. EXPORT TIMETABLE
 */
export async function exportTimetableAction(params: ExportFilterParams) {
  await requirePermission('timetable.read');
  const where: any = {};

  if (params.sectionId) {
    where.sectionId = params.sectionId;
  }

  const timetables = await prisma.timetable.findMany({
    where,
    take: 2000,
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    include: {
      section: { include: { class: { select: { name: true } } } },
      teacher: { include: { user: { select: { fullName: true } } } },
    },
  });

  const daysMap: Record<number, string> = { 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday' };

  return {
    success: true,
    rows: timetables.map((t) => ({
      Class: t.section.class.name,
      Section: t.section.name,
      Day: daysMap[t.dayOfWeek] || `Day ${t.dayOfWeek}`,
      Start_Time: t.startTime,
      End_Time: t.endTime,
      Room_No: t.roomNo || 'Main Room',
      Teacher: t.teacher.user.fullName,
    })),
  };
}
