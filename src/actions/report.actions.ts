'use server';

import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth';
import { AttendanceStatus, FeeStatus, Gender, SystemRole } from '@prisma/client';

export interface ReportFilterParams {
  category: 'STUDENT' | 'ATTENDANCE' | 'FEE' | 'EXAM' | 'TEACHER' | 'FINANCIAL';
  reportType: string;
  startDate?: string;
  endDate?: string;
  sessionId?: string;
  classId?: string;
  sectionId?: string;
  subjectId?: string;
  studentId?: string;
  teacherId?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Fetch dynamic dropdown filter options (Sessions, Classes, Sections, Subjects, Students, Teachers)
 * based on user session role.
 */
export async function getReportFilterOptionsAction() {
  const session = await requirePermission('reports.read');

  // If PARENT, restrict student dropdown to their children
  let studentWhere: any = { deletedAt: null };
  if (session.role === SystemRole.PARENT) {
    const parent = await prisma.parent.findUnique({ where: { userId: session.userId } });
    if (parent) {
      studentWhere.parents = { some: { parentId: parent.id } };
    }
  } else if (session.role === SystemRole.STUDENT) {
    studentWhere.userId = session.userId;
  }

  const [sessions, classes, sections, subjects, students, teachers] = await Promise.all([
    prisma.academicSession.findMany({
      where: { deletedAt: null },
      orderBy: { startDate: 'desc' },
      select: { id: true, name: true, isCurrent: true },
    }),
    prisma.class.findMany({
      where: { deletedAt: null },
      orderBy: { numericOrder: 'asc' },
      select: { id: true, name: true, numericOrder: true },
    }),
    prisma.section.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, classId: true },
    }),
    prisma.subject.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, code: true, classId: true },
    }),
    prisma.student.findMany({
      where: studentWhere,
      select: {
        id: true,
        admissionNo: true,
        user: { select: { fullName: true } },
      },
      orderBy: { user: { fullName: 'asc' } },
      take: 200,
    }),
    prisma.teacher.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        employeeId: true,
        user: { select: { fullName: true } },
      },
      orderBy: { user: { fullName: 'asc' } },
    }),
  ]);

  return {
    success: true,
    filterOptions: {
      sessions,
      classes,
      sections,
      subjects,
      students: students.map((s) => ({ id: s.id, name: `${s.user.fullName} (${s.admissionNo})` })),
      teachers: teachers.map((t) => ({ id: t.id, name: `${t.user.fullName} (${t.employeeId})` })),
    },
  };
}

/**
 * 1. STUDENT REPORTS
 */
export async function getStudentReportAction(params: ReportFilterParams) {
  const session = await requirePermission('reports.read');
  const page = Math.max(1, params.page || 1);
  const limit = Math.max(1, Math.min(100, params.limit || 15));
  const skip = (page - 1) * limit;

  // Scope check for Parent/Student
  let userStudentIdFilter: string | undefined = undefined;
  if (session.role === SystemRole.STUDENT) {
    const s = await prisma.student.findUnique({ where: { userId: session.userId } });
    if (s) userStudentIdFilter = s.id;
  } else if (session.role === SystemRole.PARENT) {
    const p = await prisma.parent.findUnique({ where: { userId: session.userId } });
    if (p) {
      const child = await prisma.studentParent.findFirst({ where: { parentId: p.id } });
      if (child) userStudentIdFilter = child.studentId;
    }
  }

  const where: any = {};

  if (params.reportType === 'WITHDRAWN') {
    where.OR = [{ deletedAt: { not: null } }, { user: { isActive: false } }];
  } else {
    where.deletedAt = null;
  }

  if (userStudentIdFilter) {
    where.id = userStudentIdFilter;
  } else if (params.studentId) {
    where.id = params.studentId;
  }

  if (params.search) {
    const term = params.search.trim();
    where.OR = [
      { user: { fullName: { contains: term, mode: 'insensitive' } } },
      { user: { email: { contains: term, mode: 'insensitive' } } },
      { admissionNo: { contains: term, mode: 'insensitive' } },
      { rollNumber: { contains: term, mode: 'insensitive' } },
    ];
  }

  if (params.startDate && params.endDate) {
    where.createdAt = {
      gte: new Date(params.startDate),
      lte: new Date(params.endDate),
    };
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

  const [total, students, allStudentsForStats] = await Promise.all([
    prisma.student.count({ where }),
    prisma.student.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { fullName: true, email: true, phoneNumber: true, isActive: true } },
        enrollments: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: {
            class: { select: { name: true } },
            section: { select: { name: true } },
          },
        },
      },
    }),
    prisma.student.findMany({
      where: params.reportType === 'WITHDRAWN' ? {} : { deletedAt: null },
      select: { gender: true, user: { select: { isActive: true } } },
    }),
  ]);

  const maleCount = allStudentsForStats.filter((s) => s.gender === Gender.MALE).length;
  const femaleCount = allStudentsForStats.filter((s) => s.gender === Gender.FEMALE).length;
  const activeCount = allStudentsForStats.filter((s) => s.user.isActive).length;
  const inactiveCount = allStudentsForStats.length - activeCount;

  const rows = students.map((s) => ({
    id: s.id,
    admissionNo: s.admissionNo,
    fullName: s.user.fullName,
    email: s.user.email,
    phone: s.user.phoneNumber || 'N/A',
    gender: s.gender,
    className: s.enrollments[0]?.class.name || 'Unassigned',
    sectionName: s.enrollments[0]?.section.name || 'Unassigned',
    rollNumber: s.rollNumber || 'N/A',
    status: s.user.isActive ? 'Active' : 'Inactive',
    createdAt: s.createdAt.toISOString().split('T')[0],
  }));

  return {
    success: true,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    summaryCards: [
      { label: 'Total Students', value: total },
      { label: 'Male Students', value: maleCount },
      { label: 'Female Students', value: femaleCount },
      { label: 'Active Status Rate', value: `${allStudentsForStats.length > 0 ? Math.round((activeCount / allStudentsForStats.length) * 100) : 100}%` },
    ],
    chartData: [
      { name: 'Male', count: maleCount },
      { name: 'Female', count: femaleCount },
      { name: 'Inactive/Withdrawn', count: inactiveCount },
    ],
    rows,
  };
}

/**
 * 2. ATTENDANCE REPORTS
 */
export async function getAttendanceReportAction(params: ReportFilterParams) {
  const session = await requirePermission('reports.read');
  const page = Math.max(1, params.page || 1);
  const limit = Math.max(1, Math.min(100, params.limit || 15));
  const skip = (page - 1) * limit;

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

  const [totalHeaders, attendanceHeaders] = await Promise.all([
    prisma.attendance.count({ where }),
    prisma.attendance.findMany({
      where,
      skip,
      take: limit,
      orderBy: { date: 'desc' },
      include: {
        section: { include: { class: { select: { name: true } } } },
        records: {
          include: {
            student: { include: { user: { select: { fullName: true } } } },
          },
        },
      },
    }),
  ]);

  let totalRecordsCount = 0;
  let presentCount = 0;
  let absentCount = 0;
  let lateCount = 0;
  let excusedCount = 0;

  const rows: any[] = [];
  const lowAttendanceStudentsMap = new Map<string, { fullName: string; total: number; present: number }>();

  attendanceHeaders.forEach((h) => {
    const total = h.records.length;
    const present = h.records.filter((r) => r.status === AttendanceStatus.PRESENT).length;
    const absent = h.records.filter((r) => r.status === AttendanceStatus.ABSENT).length;
    const late = h.records.filter((r) => r.status === AttendanceStatus.LATE).length;
    const excused = h.records.filter((r) => r.status === AttendanceStatus.EXCUSED).length;

    totalRecordsCount += total;
    presentCount += present;
    absentCount += absent;
    lateCount += late;
    excusedCount += excused;

    h.records.forEach((r) => {
      const prev = lowAttendanceStudentsMap.get(r.studentId) || {
        fullName: r.student.user.fullName,
        total: 0,
        present: 0,
      };
      prev.total += 1;
      if (r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.LATE) {
        prev.present += 1;
      }
      lowAttendanceStudentsMap.set(r.studentId, prev);
    });

    const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 100;

    rows.push({
      id: h.id,
      date: h.date.toISOString().split('T')[0],
      className: h.section.class.name,
      sectionName: h.section.name,
      total,
      present,
      absent,
      late,
      excused,
      rate: `${rate}%`,
    });
  });

  const lowAttendanceCount = Array.from(lowAttendanceStudentsMap.values()).filter(
    (s) => s.total > 0 && Math.round((s.present / s.total) * 100) < 75
  ).length;

  const overallRate = totalRecordsCount > 0 ? Math.round(((presentCount + lateCount) / totalRecordsCount) * 100) : 100;

  return {
    success: true,
    total: totalHeaders,
    page,
    totalPages: Math.ceil(totalHeaders / limit),
    summaryCards: [
      { label: 'Overall Attendance Rate', value: `${overallRate}%` },
      { label: 'Total Present Records', value: presentCount },
      { label: 'Total Absent Records', value: absentCount },
      { label: 'Low Attendance (<75%)', value: lowAttendanceCount },
    ],
    chartData: [
      { name: 'Present', count: presentCount },
      { name: 'Absent', count: absentCount },
      { name: 'Late', count: lateCount },
      { name: 'Excused', count: excusedCount },
    ],
    rows,
  };
}

/**
 * 3. FEE REPORTS
 */
export async function getFeeReportAction(params: ReportFilterParams) {
  const session = await requirePermission('reports.read');

  // Restrict accountant/teacher/parent/student scoping
  let studentFilterId: string | undefined = undefined;
  if (session.role === SystemRole.STUDENT) {
    const s = await prisma.student.findUnique({ where: { userId: session.userId } });
    if (s) studentFilterId = s.id;
  } else if (session.role === SystemRole.PARENT) {
    const p = await prisma.parent.findUnique({ where: { userId: session.userId } });
    if (p) {
      const child = await prisma.studentParent.findFirst({ where: { parentId: p.id } });
      if (child) studentFilterId = child.studentId;
    }
  }

  const page = Math.max(1, params.page || 1);
  const limit = Math.max(1, Math.min(100, params.limit || 15));
  const skip = (page - 1) * limit;

  const where: any = { deletedAt: null };

  if (studentFilterId) {
    where.studentId = studentFilterId;
  } else if (params.studentId) {
    where.studentId = params.studentId;
  }

  if (params.classId) {
    where.feeStructure = { classId: params.classId };
  }

  if (params.startDate && params.endDate) {
    where.dueDate = {
      gte: new Date(params.startDate),
      lte: new Date(params.endDate),
    };
  }

  if (params.reportType === 'PAID') where.status = FeeStatus.PAID;
  if (params.reportType === 'PENDING') where.status = FeeStatus.UNPAID;
  if (params.reportType === 'PARTIAL') where.status = FeeStatus.PARTIALLY_PAID;

  const [total, fees, allFeesAgg] = await Promise.all([
    prisma.studentFee.count({ where }),
    prisma.studentFee.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        student: { include: { user: { select: { fullName: true } } } },
        feeStructure: { select: { name: true } },
        payments: true,
      },
    }),
    prisma.studentFee.findMany({
      where,
      select: { amount: true, paidAmount: true, discountAmount: true, lateFeeAmount: true, status: true },
    }),
  ]);

  let totalInvoiced = 0;
  let totalPaid = 0;
  let totalDiscount = 0;
  let totalLateFee = 0;

  allFeesAgg.forEach((f) => {
    totalInvoiced += Number(f.amount);
    totalPaid += Number(f.paidAmount);
    totalDiscount += Number(f.discountAmount);
    totalLateFee += Number(f.lateFeeAmount);
  });

  const totalOutstanding = Math.max(0, totalInvoiced - totalPaid);

  const rows = fees.map((f) => ({
    id: f.id,
    invoiceNo: f.invoiceNo,
    studentName: f.student.user.fullName,
    structureName: f.feeStructure.name,
    amount: `$${Number(f.amount).toFixed(2)}`,
    discountAmount: `$${Number(f.discountAmount).toFixed(2)}`,
    paidAmount: `$${Number(f.paidAmount).toFixed(2)}`,
    balance: `$${Math.max(0, Number(f.amount) - Number(f.paidAmount)).toFixed(2)}`,
    status: f.status,
    dueDate: f.dueDate.toISOString().split('T')[0],
  }));

  return {
    success: true,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    summaryCards: [
      { label: 'Total Invoiced', value: `$${totalInvoiced.toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
      { label: 'Total Revenue Collected', value: `$${totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
      { label: 'Outstanding Balance', value: `$${totalOutstanding.toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
      { label: 'Discounts Awarded', value: `$${totalDiscount.toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
    ],
    chartData: [
      { name: 'Collected', amount: totalPaid },
      { name: 'Outstanding', amount: totalOutstanding },
      { name: 'Discounts', amount: totalDiscount },
    ],
    rows,
  };
}

/**
 * 4. EXAMINATION REPORTS
 */
export async function getExamReportAction(params: ReportFilterParams) {
  const session = await requirePermission('reports.read');
  const page = Math.max(1, params.page || 1);
  const limit = Math.max(1, Math.min(100, params.limit || 15));
  const skip = (page - 1) * limit;

  const where: any = {};

  if (params.classId) {
    where.examSubject = { subject: { classId: params.classId } };
  }

  if (params.subjectId) {
    where.examSubject = { subjectId: params.subjectId };
  }

  if (params.studentId) {
    where.studentId = params.studentId;
  }

  const [total, results, allResults] = await Promise.all([
    prisma.examResult.count({ where }),
    prisma.examResult.findMany({
      where,
      skip,
      take: limit,
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
    }),
    prisma.examResult.findMany({
      where,
      include: { examSubject: { select: { passingMarks: true, maxMarks: true } } },
    }),
  ]);

  let passCount = 0;
  let failCount = 0;
  let sumMarks = 0;
  const gradeCounts: Record<string, number> = { 'A+': 0, A: 0, B: 0, C: 0, D: 0, F: 0 };

  allResults.forEach((r) => {
    sumMarks += r.marksObtained;
    if (r.marksObtained >= r.examSubject.passingMarks) {
      passCount++;
    } else {
      failCount++;
    }
    const g = r.grade || 'F';
    gradeCounts[g] = (gradeCounts[g] || 0) + 1;
  });

  const avgMarks = allResults.length > 0 ? Math.round((sumMarks / allResults.length) * 10) / 10 : 0;
  const passRate = allResults.length > 0 ? Math.round((passCount / allResults.length) * 100) : 0;

  const rows = results.map((r, index) => ({
    id: r.id,
    rank: `#${skip + index + 1}`,
    studentName: r.student.user.fullName,
    examName: r.examSubject.exam.name,
    subjectName: `${r.examSubject.subject.name} (${r.examSubject.subject.code})`,
    marksObtained: r.marksObtained,
    maxMarks: r.examSubject.maxMarks,
    grade: r.grade || 'N/A',
    status: r.marksObtained >= r.examSubject.passingMarks ? 'PASS' : 'FAIL',
    remarks: r.remarks || '-',
  }));

  return {
    success: true,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    summaryCards: [
      { label: 'Total Students Examined', value: allResults.length },
      { label: 'Overall Pass Rate', value: `${passRate}%` },
      { label: 'Average Score', value: `${avgMarks}/100` },
      { label: 'Students Needing Attention', value: failCount },
    ],
    chartData: Object.keys(gradeCounts).map((g) => ({ name: `Grade ${g}`, count: gradeCounts[g] })),
    rows,
  };
}

/**
 * 5. TEACHER REPORTS
 */
export async function getTeacherReportAction(params: ReportFilterParams) {
  await requirePermission('reports.read');
  const page = Math.max(1, params.page || 1);
  const limit = Math.max(1, Math.min(100, params.limit || 15));
  const skip = (page - 1) * limit;

  const where: any = { deletedAt: null };

  if (params.teacherId) {
    where.id = params.teacherId;
  }

  if (params.search) {
    const term = params.search.trim();
    where.OR = [
      { user: { fullName: { contains: term, mode: 'insensitive' } } },
      { employeeId: { contains: term, mode: 'insensitive' } },
      { qualification: { contains: term, mode: 'insensitive' } },
    ];
  }

  const [total, teachers] = await Promise.all([
    prisma.teacher.count({ where }),
    prisma.teacher.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { fullName: true, email: true, phoneNumber: true, isActive: true } },
        teacherSubjects: {
          include: {
            subject: { select: { name: true } },
            section: { include: { class: { select: { name: true } } } },
          },
        },
      },
    }),
  ]);

  const rows = teachers.map((t) => ({
    id: t.id,
    employeeId: t.employeeId,
    fullName: t.user.fullName,
    email: t.user.email,
    phone: t.user.phoneNumber || 'N/A',
    qualification: t.qualification,
    joiningDate: t.joiningDate.toISOString().split('T')[0],
    assignedCount: t.teacherSubjects.length,
    assignments: t.teacherSubjects
      .map((ts) => `${ts.subject.name} (${ts.section.class.name} - ${ts.section.name})`)
      .join(', ') || 'No active classes assigned',
    status: t.user.isActive ? 'Active' : 'Inactive',
  }));

  return {
    success: true,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    summaryCards: [
      { label: 'Total Faculty Members', value: total },
      { label: 'Active Teachers', value: teachers.filter((t) => t.user.isActive).length },
      { label: 'Total Class Assignments', value: teachers.reduce((acc, t) => acc + t.teacherSubjects.length, 0) },
    ],
    chartData: teachers.slice(0, 10).map((t) => ({ name: t.user.fullName.split(' ')[0], workload: t.teacherSubjects.length })),
    rows,
  };
}

/**
 * 6. FINANCIAL REPORTS
 */
export async function getFinancialReportAction(params: ReportFilterParams) {
  await requirePermission('reports.read');
  const page = Math.max(1, params.page || 1);
  const limit = Math.max(1, Math.min(100, params.limit || 15));
  const skip = (page - 1) * limit;

  const paymentWhere: any = {};
  const expenseWhere: any = { deletedAt: null };

  if (params.startDate && params.endDate) {
    paymentWhere.paymentDate = {
      gte: new Date(params.startDate),
      lte: new Date(params.endDate),
    };
    expenseWhere.expenseDate = {
      gte: new Date(params.startDate),
      lte: new Date(params.endDate),
    };
  }

  const [payments, expenses] = await Promise.all([
    prisma.feePayment.findMany({
      where: paymentWhere,
      orderBy: { paymentDate: 'desc' },
      include: {
        studentFee: {
          include: { student: { include: { user: { select: { fullName: true } } } } },
        },
      },
    }),
    prisma.expense.findMany({
      where: expenseWhere,
      orderBy: { expenseDate: 'desc' },
    }),
  ]);

  let totalRevenue = 0;
  let totalExpenses = 0;

  payments.forEach((p) => (totalRevenue += Number(p.amount)));
  expenses.forEach((e) => (totalExpenses += Number(e.amount)));

  const netBalance = totalRevenue - totalExpenses;

  // Unified financial ledger entries
  const ledgerEntries = [
    ...payments.map((p) => ({
      id: p.id,
      date: p.paymentDate.toISOString().split('T')[0],
      type: 'REVENUE',
      title: `Fee Collection: ${p.studentFee.student.user.fullName}`,
      category: 'Student Fees',
      method: p.paymentMethod,
      amount: `+$${Number(p.amount).toFixed(2)}`,
      numericAmount: Number(p.amount),
      ref: p.transactionRef,
    })),
    ...expenses.map((e) => ({
      id: e.id,
      date: e.expenseDate.toISOString().split('T')[0],
      type: 'EXPENSE',
      title: e.title,
      category: e.category,
      method: 'CASH/BANK',
      amount: `-$${Number(e.amount).toFixed(2)}`,
      numericAmount: -Number(e.amount),
      ref: `EXP-${e.id.slice(-6)}`,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const paginatedRows = ledgerEntries.slice(skip, skip + limit);

  return {
    success: true,
    total: ledgerEntries.length,
    page,
    totalPages: Math.ceil(ledgerEntries.length / limit),
    summaryCards: [
      { label: 'Total Revenue', value: `$${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
      { label: 'Total Expenses', value: `$${totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
      { label: 'Net Profit / Loss', value: `$${netBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
      { label: 'Profit Margin', value: `${totalRevenue > 0 ? Math.round((netBalance / totalRevenue) * 100) : 0}%` },
    ],
    chartData: [
      { name: 'Revenue', amount: totalRevenue },
      { name: 'Expenses', amount: totalExpenses },
      { name: 'Net Profit', amount: Math.max(0, netBalance) },
    ],
    rows: paginatedRows,
  };
}
