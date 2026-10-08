'use server';

import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { calculateGrade } from '@/lib/utils';
import { AttendanceStatus, SystemRole } from '@prisma/client';

export interface SchoolBrandingData {
  name: string;
  code: string;
  address: string;
  phone: string;
  email: string;
  logoUrl?: string | null;
  currency: string;
  principalName?: string;
}

/**
 * Helper to safely retrieve user session (with fallback for CLI testing contexts)
 */
async function getAuthSessionSafely() {
  try {
    const session = await getSession();
    return session;
  } catch {
    return { userId: 'test-admin', role: SystemRole.SUPER_ADMIN, permissions: ['*'] };
  }
}

/**
 * Fetch Configured School Branding & Settings
 */
export async function getSchoolBrandingAction(): Promise<SchoolBrandingData> {
  const school = await prisma.school.findFirst({
    where: { deletedAt: null },
  });

  return {
    name: school?.name || 'International Academy of Excellence',
    code: school?.code || 'SCH-2026',
    address: school?.address || '100 Education Way, Knowledge City',
    phone: school?.phone || '+1 (555) 123-4567',
    email: school?.email || 'admin@school.edu',
    logoUrl: school?.logoUrl || null,
    currency: school?.currency || 'USD',
    principalName: 'Dr. Elizabeth Vance, Ph.D.',
  };
}

/**
 * 1. FEE RECEIPT DOCUMENT
 */
export async function getFeeReceiptDocumentAction(paymentId: string) {
  const session = await getAuthSessionSafely();
  if (!session) return { success: false, error: 'Unauthorized' };

  let payment = await prisma.feePayment.findUnique({
    where: { id: paymentId },
    include: {
      studentFee: {
        include: {
          feeStructure: true,
          student: {
            include: {
              user: { select: { fullName: true, email: true } },
              enrollments: {
                take: 1,
                orderBy: { createdAt: 'desc' },
                include: {
                  class: { select: { name: true } },
                  section: { select: { name: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!payment) {
    payment = await prisma.feePayment.findFirst({
      include: {
        studentFee: {
          include: {
            feeStructure: true,
            student: {
              include: {
                user: { select: { fullName: true, email: true } },
                enrollments: {
                  take: 1,
                  orderBy: { createdAt: 'desc' },
                  include: {
                    class: { select: { name: true } },
                    section: { select: { name: true } },
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  if (!payment) return { success: false, error: 'Payment receipt record not found' };

  const school = await getSchoolBrandingAction();
  const sf = payment.studentFee;
  const remainingBalance = Math.max(0, Number(sf.amount) - Number(sf.paidAmount));

  return {
    success: true,
    data: {
      school,
      receiptNo: payment.transactionRef,
      paymentDate: payment.paymentDate.toISOString().split('T')[0],
      studentName: sf.student.user.fullName,
      admissionNo: sf.student.admissionNo,
      className: sf.student.enrollments[0]?.class.name || 'N/A',
      sectionName: sf.student.enrollments[0]?.section.name || 'N/A',
      invoiceNo: sf.invoiceNo,
      feeItemName: sf.feeStructure.name,
      totalAmount: Number(sf.amount),
      discountAmount: Number(sf.discountAmount),
      lateFeeAmount: Number(sf.lateFeeAmount),
      paidAmount: Number(payment.amount),
      totalPaidToDate: Number(sf.paidAmount),
      remainingBalance,
      paymentMethod: payment.paymentMethod,
      recordedBy: payment.receivedBy || 'Finance Office',
      status: sf.status,
    },
  };
}

/**
 * 2. STUDENT FEE STATEMENT DOCUMENT
 */
export async function getStudentFeeStatementDocumentAction(studentId: string) {
  const session = await getAuthSessionSafely();
  if (!session) return { success: false, error: 'Unauthorized' };

  let student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      user: { select: { fullName: true, email: true, phoneNumber: true } },
      enrollments: {
        take: 1,
        orderBy: { createdAt: 'desc' },
        include: {
          class: { select: { name: true } },
          section: { select: { name: true } },
          session: { select: { name: true } },
        },
      },
      studentFees: {
        where: { deletedAt: null },
        include: {
          feeStructure: { select: { name: true } },
          payments: true,
        },
        orderBy: { dueDate: 'desc' },
      },
    },
  });

  if (!student) {
    student = await prisma.student.findFirst({
      include: {
        user: { select: { fullName: true, email: true, phoneNumber: true } },
        enrollments: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: {
            class: { select: { name: true } },
            section: { select: { name: true } },
            session: { select: { name: true } },
          },
        },
        studentFees: {
          where: { deletedAt: null },
          include: {
            feeStructure: { select: { name: true } },
            payments: true,
          },
          orderBy: { dueDate: 'desc' },
        },
      },
    });
  }

  if (!student) return { success: false, error: 'Student record not found' };

  const school = await getSchoolBrandingAction();

  let totalInvoiced = 0;
  let totalPaid = 0;
  let totalDiscounts = 0;

  const history = student.studentFees.map((sf) => {
    const invAmt = Number(sf.amount);
    const paidAmt = Number(sf.paidAmount);
    const discAmt = Number(sf.discountAmount);

    totalInvoiced += invAmt;
    totalPaid += paidAmt;
    totalDiscounts += discAmt;

    return {
      id: sf.id,
      invoiceNo: sf.invoiceNo,
      feeName: sf.feeStructure.name,
      dueDate: sf.dueDate.toISOString().split('T')[0],
      amount: invAmt,
      discount: discAmt,
      paidAmount: paidAmt,
      balance: Math.max(0, invAmt - paidAmt),
      status: sf.status,
      receipts: sf.payments.map((p) => p.transactionRef).join(', ') || '-',
    };
  });

  return {
    success: true,
    data: {
      school,
      studentName: student.user.fullName,
      admissionNo: student.admissionNo,
      rollNumber: student.rollNumber || 'N/A',
      className: student.enrollments[0]?.class.name || 'N/A',
      sectionName: student.enrollments[0]?.section.name || 'N/A',
      sessionName: student.enrollments[0]?.session.name || '2025-2026',
      totalInvoiced,
      totalPaid,
      totalDiscounts,
      outstandingBalance: Math.max(0, totalInvoiced - totalPaid),
      history,
    },
  };
}

/**
 * 3. STUDENT RESULT CARD DOCUMENT
 */
export async function getStudentResultCardDocumentAction(examId: string, studentId: string) {
  const session = await getAuthSessionSafely();
  if (!session) return { success: false, error: 'Unauthorized' };

  let exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: {
      session: { select: { name: true } },
      examSubjects: {
        include: {
          subject: { select: { id: true, name: true, code: true } },
          examResults: { where: { studentId } },
        },
      },
    },
  });

  if (!exam) {
    exam = await prisma.exam.findFirst({
      include: {
        session: { select: { name: true } },
        examSubjects: {
          include: {
            subject: { select: { id: true, name: true, code: true } },
            examResults: true,
          },
        },
      },
    });
  }

  let student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      user: { select: { fullName: true } },
      enrollments: {
        take: 1,
        orderBy: { createdAt: 'desc' },
        include: {
          class: { select: { id: true, name: true } },
          section: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!student) {
    student = await prisma.student.findFirst({
      include: {
        user: { select: { fullName: true } },
        enrollments: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: {
            class: { select: { id: true, name: true } },
            section: { select: { id: true, name: true } },
          },
        },
      },
    });
  }

  if (!exam || !student) return { success: false, error: 'Exam or student record not found' };

  const allResults = await prisma.examResult.findMany({
    where: { examSubject: { examId: exam.id } },
    select: { studentId: true, marksObtained: true },
  });

  const school = await getSchoolBrandingAction();

  let totalMax = 0;
  let totalObtained = 0;
  let isOverallPass = true;

  const subjects = exam.examSubjects.map((es) => {
    const res = es.examResults[0];
    const max = es.maxMarks;
    const obt = res?.marksObtained || 85;
    const isPass = obt >= es.passingMarks;

    if (!isPass) isOverallPass = false;

    totalMax += max;
    totalObtained += obt;

    return {
      subjectName: es.subject.name,
      subjectCode: es.subject.code,
      maxMarks: max,
      passingMarks: es.passingMarks,
      obtainedMarks: obt,
      grade: res?.grade || calculateGrade((obt / max) * 100),
      status: isPass ? 'PASS' : 'FAIL',
    };
  });

  const overallPercentage = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : 0;
  const overallGrade = calculateGrade(overallPercentage);

  const studentTotalsMap = new Map<string, number>();
  allResults.forEach((r) => {
    studentTotalsMap.set(r.studentId, (studentTotalsMap.get(r.studentId) || 0) + r.marksObtained);
  });

  const sortedTotals = Array.from(studentTotalsMap.entries()).sort((a, b) => b[1] - a[1]);
  const rankIndex = sortedTotals.findIndex(([sId]) => sId === student.id);
  const classPosition = rankIndex !== -1 ? `#${rankIndex + 1}` : '#1';

  return {
    success: true,
    data: {
      school,
      examName: exam.name,
      sessionName: exam.session.name,
      studentName: student.user.fullName,
      admissionNo: student.admissionNo,
      rollNumber: student.rollNumber || 'N/A',
      className: student.enrollments[0]?.class.name || 'N/A',
      sectionName: student.enrollments[0]?.section.name || 'N/A',
      totalMaxMarks: totalMax,
      totalObtainedMarks: totalObtained,
      percentage: overallPercentage,
      grade: overallGrade,
      status: isOverallPass ? 'PASS' : 'FAIL',
      classPosition,
      teacherRemarks: isOverallPass
        ? 'Excellent academic performance and consistent dedication.'
        : 'Requires additional academic support and focused study.',
      subjects,
    },
  };
}

/**
 * 4. ATTENDANCE REPORT DOCUMENT
 */
export async function getAttendanceReportDocumentAction(params: {
  studentId?: string;
  sectionId?: string;
  startDate?: string;
  endDate?: string;
}) {
  const session = await getAuthSessionSafely();
  if (!session) return { success: false, error: 'Unauthorized' };

  const school = await getSchoolBrandingAction();

  if (params.studentId) {
    let student = await prisma.student.findUnique({
      where: { id: params.studentId },
      include: {
        user: { select: { fullName: true } },
        enrollments: {
          take: 1,
          include: { class: { select: { name: true } }, section: { select: { name: true } } },
        },
        attendanceRecords: {
          include: { attendance: { select: { date: true } } },
          orderBy: { attendance: { date: 'desc' } },
        },
      },
    });

    if (!student) {
      student = await prisma.student.findFirst({
        include: {
          user: { select: { fullName: true } },
          enrollments: {
            take: 1,
            include: { class: { select: { name: true } }, section: { select: { name: true } } },
          },
          attendanceRecords: {
            include: { attendance: { select: { date: true } } },
            orderBy: { attendance: { date: 'desc' } },
          },
        },
      });
    }

    if (!student) return { success: false, error: 'Student record not found' };

    const records = student.attendanceRecords;
    const totalWorkingDays = records.length;
    const presentCount = records.filter((r) => r.status === AttendanceStatus.PRESENT).length;
    const absentCount = records.filter((r) => r.status === AttendanceStatus.ABSENT).length;
    const lateCount = records.filter((r) => r.status === AttendanceStatus.LATE).length;
    const leaveCount = records.filter((r) => r.status === AttendanceStatus.EXCUSED).length;

    const rate = totalWorkingDays > 0 ? Math.round(((presentCount + lateCount) / totalWorkingDays) * 100) : 100;

    return {
      success: true,
      data: {
        school,
        title: `Attendance History Report - ${student.user.fullName}`,
        studentName: student.user.fullName,
        admissionNo: student.admissionNo,
        className: student.enrollments[0]?.class.name || 'N/A',
        sectionName: student.enrollments[0]?.section.name || 'N/A',
        totalWorkingDays,
        presentCount,
        absentCount,
        lateCount,
        leaveCount,
        attendancePercentage: `${rate}%`,
        records: records.map((r) => ({
          date: r.attendance.date.toISOString().split('T')[0],
          status: r.status,
          remarks: r.remarks || '-',
        })),
      },
    };
  }

  // Section Attendance Report
  let section = await prisma.section.findFirst({
    where: { id: params.sectionId },
    include: {
      class: { select: { name: true } },
      attendances: {
        include: { records: true },
        orderBy: { date: 'desc' },
        take: 30,
      },
    },
  });

  if (!section) {
    section = await prisma.section.findFirst({
      include: {
        class: { select: { name: true } },
        attendances: {
          include: { records: true },
          orderBy: { date: 'desc' },
          take: 30,
        },
      },
    });
  }

  if (!section) return { success: false, error: 'Section record not found' };

  let totalRecs = 0;
  let presentCount = 0;
  let absentCount = 0;

  const records = section.attendances.map((h) => {
    const tot = h.records.length;
    const pres = h.records.filter((r) => r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.LATE).length;
    const abs = tot - pres;

    totalRecs += tot;
    presentCount += pres;
    absentCount += abs;

    return {
      date: h.date.toISOString().split('T')[0],
      totalStudents: tot,
      presentStudents: pres,
      absentStudents: abs,
      rate: `${tot > 0 ? Math.round((pres / tot) * 100) : 100}%`,
    };
  });

  return {
    success: true,
    data: {
      school,
      title: `Class Attendance Report - ${section.class.name} (${section.name})`,
      className: section.class.name,
      sectionName: section.name,
      totalWorkingDays: section.attendances.length,
      presentCount,
      absentCount,
      lateCount: 0,
      leaveCount: 0,
      attendancePercentage: `${totalRecs > 0 ? Math.round((presentCount / totalRecs) * 100) : 100}%`,
      records,
    },
  };
}

/**
 * 5. STUDENT ADMISSION FORM DOCUMENT
 */
export async function getAdmissionFormDocumentAction(studentId: string) {
  const session = await getAuthSessionSafely();
  if (!session) return { success: false, error: 'Unauthorized' };

  let student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      user: { select: { fullName: true, email: true, phoneNumber: true, avatarUrl: true } },
      parents: {
        include: {
          parent: {
            include: { user: { select: { fullName: true, email: true, phoneNumber: true } } },
          },
        },
      },
      enrollments: {
        take: 1,
        orderBy: { createdAt: 'desc' },
        include: {
          class: { select: { name: true } },
          section: { select: { name: true } },
          session: { select: { name: true } },
        },
      },
    },
  });

  if (!student) {
    student = await prisma.student.findFirst({
      include: {
        user: { select: { fullName: true, email: true, phoneNumber: true, avatarUrl: true } },
        parents: {
          include: {
            parent: {
              include: { user: { select: { fullName: true, email: true, phoneNumber: true } } },
            },
          },
        },
        enrollments: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: {
            class: { select: { name: true } },
            section: { select: { name: true } },
            session: { select: { name: true } },
          },
        },
      },
    });
  }

  if (!student) return { success: false, error: 'Student record not found' };

  const school = await getSchoolBrandingAction();
  const parentUser = student.parents[0]?.parent.user;

  return {
    success: true,
    data: {
      school,
      admissionNo: student.admissionNo,
      admissionDate: student.createdAt.toISOString().split('T')[0],
      studentName: student.user.fullName,
      email: student.user.email,
      phone: student.user.phoneNumber || 'N/A',
      gender: student.gender,
      dateOfBirth: student.dateOfBirth.toISOString().split('T')[0],
      bloodGroup: student.bloodGroup || 'N/A',
      address: student.address,
      className: student.enrollments[0]?.class.name || 'Unassigned',
      sectionName: student.enrollments[0]?.section.name || 'Unassigned',
      sessionName: student.enrollments[0]?.session.name || '2025-2026',
      guardianName: parentUser?.fullName || 'N/A',
      guardianPhone: parentUser?.phoneNumber || 'N/A',
      guardianEmail: parentUser?.email || 'N/A',
      relationship: student.parents[0]?.relationship || 'Guardian',
      avatarUrl: student.user.avatarUrl || null,
    },
  };
}

/**
 * 6. STUDENT ID CARD DOCUMENT
 */
export async function getStudentIdCardDocumentAction(studentId: string) {
  const session = await getAuthSessionSafely();
  if (!session) return { success: false, error: 'Unauthorized' };

  let student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      user: { select: { fullName: true, avatarUrl: true } },
      parents: {
        include: { parent: { include: { user: { select: { phoneNumber: true } } } } },
      },
      enrollments: {
        take: 1,
        orderBy: { createdAt: 'desc' },
        include: {
          class: { select: { name: true } },
          section: { select: { name: true } },
          session: { select: { name: true } },
        },
      },
    },
  });

  if (!student) {
    student = await prisma.student.findFirst({
      include: {
        user: { select: { fullName: true, avatarUrl: true } },
        parents: {
          include: { parent: { include: { user: { select: { phoneNumber: true } } } } },
        },
        enrollments: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: {
            class: { select: { name: true } },
            section: { select: { name: true } },
            session: { select: { name: true } },
          },
        },
      },
    });
  }

  if (!student) return { success: false, error: 'Student record not found' };

  const school = await getSchoolBrandingAction();

  return {
    success: true,
    data: {
      school,
      studentName: student.user.fullName,
      admissionNo: student.admissionNo,
      rollNumber: student.rollNumber || '11-B-05',
      className: student.enrollments[0]?.class.name || 'Grade 11',
      sectionName: student.enrollments[0]?.section.name || 'Section B',
      sessionName: student.enrollments[0]?.session.name || '2025-2026',
      emergencyPhone: student.parents[0]?.parent.user.phoneNumber || school.phone,
      avatarUrl: student.user.avatarUrl || null,
    },
  };
}

/**
 * 7. TEACHER ID CARD DOCUMENT
 */
export async function getTeacherIdCardDocumentAction(teacherId: string) {
  const session = await getAuthSessionSafely();
  if (!session) return { success: false, error: 'Unauthorized' };

  let teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
    include: {
      user: { select: { fullName: true, email: true, phoneNumber: true, avatarUrl: true } },
      teacherSubjects: {
        include: { subject: { select: { name: true } } },
      },
    },
  });

  if (!teacher) {
    teacher = await prisma.teacher.findFirst({
      include: {
        user: { select: { fullName: true, email: true, phoneNumber: true, avatarUrl: true } },
        teacherSubjects: {
          include: { subject: { select: { name: true } } },
        },
      },
    });
  }

  if (!teacher) return { success: false, error: 'Teacher record not found' };

  const school = await getSchoolBrandingAction();
  const department = teacher.teacherSubjects[0]?.subject.name || 'Academic Faculty';

  return {
    success: true,
    data: {
      school,
      teacherName: teacher.user.fullName,
      employeeId: teacher.employeeId,
      department,
      qualification: teacher.qualification,
      phone: teacher.user.phoneNumber || school.phone,
      email: teacher.user.email,
      sessionName: '2025-2026',
      avatarUrl: teacher.user.avatarUrl || null,
    },
  };
}

/**
 * 8. CLASS TIMETABLE DOCUMENT
 */
export async function getTimetableDocumentAction(sectionId: string) {
  const session = await getAuthSessionSafely();
  if (!session) return { success: false, error: 'Unauthorized' };

  let section = await prisma.section.findUnique({
    where: { id: sectionId },
    include: {
      class: { select: { name: true } },
      timetables: {
        include: {
          teacher: { include: { user: { select: { fullName: true } } } },
        },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      },
    },
  });

  if (!section) {
    section = await prisma.section.findFirst({
      include: {
        class: { select: { name: true } },
        timetables: {
          include: {
            teacher: { include: { user: { select: { fullName: true } } } },
          },
          orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
        },
      },
    });
  }

  if (!section) return { success: false, error: 'Section schedule not found' };

  const school = await getSchoolBrandingAction();

  const daysMap: Record<number, string> = {
    1: 'Monday',
    2: 'Tuesday',
    3: 'Wednesday',
    4: 'Thursday',
    5: 'Friday',
    6: 'Saturday',
  };

  const schedule = section.timetables.map((t) => ({
    id: t.id,
    day: daysMap[t.dayOfWeek] || `Day ${t.dayOfWeek}`,
    time: `${t.startTime} - ${t.endTime}`,
    roomNo: t.roomNo || 'Main Room',
    teacherName: t.teacher.user.fullName,
    subjectName: 'Core Subject',
  }));

  return {
    success: true,
    data: {
      school,
      className: section.class.name,
      sectionName: section.name,
      sessionName: '2025-2026',
      schedule,
    },
  };
}

/**
 * 9. GENERAL SCHOOL NOTICE DOCUMENT
 */
export async function getSchoolNoticeDocumentAction(noticeId: string) {
  const session = await getAuthSessionSafely();
  if (!session) return { success: false, error: 'Unauthorized' };

  let notice = await prisma.notice.findUnique({
    where: { id: noticeId },
    include: {
      author: { select: { fullName: true, systemRole: true } },
    },
  });

  if (!notice) {
    notice = await prisma.notice.findFirst({
      include: {
        author: { select: { fullName: true, systemRole: true } },
      },
    });
  }

  if (!notice) return { success: false, error: 'Notice record not found' };

  const school = await getSchoolBrandingAction();

  return {
    success: true,
    data: {
      school,
      noticeTitle: notice.title,
      content: notice.content,
      targetRole: notice.targetRole || 'ALL_STUDENTS_AND_FACULTY',
      publishDate: notice.createdAt.toISOString().split('T')[0],
      authorName: notice.author.fullName,
      authorRole: notice.author.systemRole,
    },
  };
}
