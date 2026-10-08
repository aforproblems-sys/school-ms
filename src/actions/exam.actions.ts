'use server';

import { prisma } from '@/lib/prisma';
import { getSession, requirePermission } from '@/lib/auth';
import {
  createExamSchema,
  CreateExamFormValues,
  assignExamSubjectSchema,
  AssignExamSubjectFormValues,
  saveMarksSheetSchema,
  SaveMarksSheetFormValues,
} from '@/schemas/exam.schema';
import { AuditAction, SystemRole } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { calculateGrade } from '@/lib/utils';

// ==========================================
// 1. EXAM CREATION & MANAGEMENT
// ==========================================

export async function getExamsAction() {
  await requirePermission('students.read');
  const exams = await prisma.exam.findMany({
    where: { deletedAt: null },
    include: {
      session: { select: { id: true, name: true } },
      examSubjects: {
        include: {
          subject: { select: { id: true, name: true, code: true, class: { select: { name: true } } } },
          _count: { select: { examResults: true } },
        },
      },
    },
    orderBy: { startDate: 'desc' },
  });

  return {
    success: true,
    exams: exams.map((e) => ({
      id: e.id,
      name: e.name,
      sessionName: e.session.name,
      startDate: e.startDate,
      endDate: e.endDate,
      isPublished: e.isPublished,
      subjectCount: e.examSubjects.length,
      examSubjects: e.examSubjects.map((es) => ({
        id: es.id,
        subjectName: es.subject.name,
        subjectCode: es.subject.code,
        className: es.subject.class.name,
        examDate: es.examDate,
        maxMarks: es.maxMarks,
        passingMarks: es.passingMarks,
        recordedResultsCount: es._count.examResults,
      })),
    })),
  };
}

export async function createExamAction(values: CreateExamFormValues) {
  const session = await requirePermission('results.publish');
  const validation = createExamSchema.safeParse(values);

  if (!validation.success) {
    return {
      success: false,
      error: 'Validation failed',
      fieldErrors: validation.error.flatten().fieldErrors,
    };
  }

  const { name, startDate, endDate, academicSessionId } = validation.data;

  try {
    let activeSessionId = academicSessionId;
    if (!activeSessionId) {
      const currentSession = await prisma.academicSession.findFirst({
        where: { isCurrent: true, deletedAt: null },
      });
      if (!currentSession) {
        return { success: false, error: 'No active academic session found' };
      }
      activeSessionId = currentSession.id;
    }

    const exam = await prisma.exam.create({
      data: {
        name,
        academicSessionId: activeSessionId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: AuditAction.CREATE,
        entity: 'Exam',
        entityId: exam.id,
        newValue: { name, startDate, endDate },
      },
    });

    revalidatePath('/dashboard/examinations/exams');
    return { success: true, exam };
  } catch (error) {
    console.error('Create exam error:', error);
    return { success: false, error: 'Failed to create examination session' };
  }
}

// ==========================================
// 2. ASSIGN SUBJECTS TO EXAM
// ==========================================

export async function assignExamSubjectAction(values: AssignExamSubjectFormValues) {
  const session = await requirePermission('results.publish');
  const validation = assignExamSubjectSchema.safeParse(values);

  if (!validation.success) {
    return {
      success: false,
      error: 'Validation failed',
      fieldErrors: validation.error.flatten().fieldErrors,
    };
  }

  const { examId, subjectId, examDate, maxMarks, passingMarks } = validation.data;

  try {
    const existing = await prisma.examSubject.findUnique({
      where: {
        examId_subjectId: { examId, subjectId },
      },
    });

    if (existing) {
      return { success: false, error: 'Subject is already assigned to this examination' };
    }

    const examSubject = await prisma.examSubject.create({
      data: {
        examId,
        subjectId,
        examDate: new Date(examDate),
        maxMarks,
        passingMarks,
      },
    });

    revalidatePath('/dashboard/examinations/exams');
    return { success: true, examSubject };
  } catch (error) {
    console.error('Assign exam subject error:', error);
    return { success: false, error: 'Failed to assign subject to exam' };
  }
}

// ==========================================
// 3. ENTER & UPDATE MARKS (WITH PUBLISH LOCK)
// ==========================================

export async function getExamMarksSheetAction(params: { examSubjectId: string; sectionId?: string }) {
  await requirePermission('students.read');

  const examSubject = await prisma.examSubject.findUnique({
    where: { id: params.examSubjectId },
    include: {
      exam: { select: { id: true, name: true, isPublished: true } },
      subject: {
        select: {
          id: true,
          name: true,
          code: true,
          classId: true,
          class: { select: { name: true } },
        },
      },
      examResults: {
        select: {
          id: true,
          studentId: true,
          marksObtained: true,
          grade: true,
          remarks: true,
        },
      },
    },
  });

  if (!examSubject) {
    return { success: false, error: 'Exam subject record not found' };
  }

  // Fetch students enrolled in this class / section
  const enrollments = await prisma.enrollment.findMany({
    where: {
      classId: examSubject.subject.classId,
      ...(params.sectionId && { sectionId: params.sectionId }),
      deletedAt: null,
    },
    include: {
      student: {
        include: {
          user: { select: { fullName: true } },
        },
      },
      section: { select: { name: true } },
    },
    orderBy: { rollNumber: 'asc' },
  });

  const resultMap = new Map<string, { marksObtained: number; grade?: string | null; remarks?: string | null }>();
  examSubject.examResults.forEach((r) => {
    resultMap.set(r.studentId, {
      marksObtained: r.marksObtained,
      grade: r.grade,
      remarks: r.remarks,
    });
  });

  const students = enrollments.map((e) => {
    const s = e.student;
    const existing = resultMap.get(s.id);
    return {
      studentId: s.id,
      fullName: s.user.fullName,
      admissionNo: s.admissionNo,
      rollNumber: e.rollNumber || s.rollNumber || 'N/A',
      sectionName: e.section.name,
      currentMarks: existing ? existing.marksObtained : 0,
      currentGrade: existing ? existing.grade || calculateGrade((existing.marksObtained / examSubject.maxMarks) * 100) : 'N/A',
      currentRemarks: existing?.remarks || '',
    };
  });

  return {
    success: true,
    examName: examSubject.exam.name,
    subjectName: examSubject.subject.name,
    className: examSubject.subject.class.name,
    maxMarks: examSubject.maxMarks,
    passingMarks: examSubject.passingMarks,
    isPublished: examSubject.exam.isPublished,
    students,
  };
}

export async function saveMarksAction(values: SaveMarksSheetFormValues) {
  const session = await requirePermission('results.publish');
  const validation = saveMarksSheetSchema.safeParse(values);

  if (!validation.success) {
    return {
      success: false,
      error: 'Validation failed',
      fieldErrors: validation.error.flatten().fieldErrors,
    };
  }

  const { examSubjectId, records } = validation.data;

  try {
    const examSubject = await prisma.examSubject.findUnique({
      where: { id: examSubjectId },
      include: { exam: { select: { id: true, isPublished: true, name: true } } },
    });

    if (!examSubject) {
      return { success: false, error: 'Exam subject not found' };
    }

    // Lock enforcement: Prevent modification if results are published
    if (examSubject.exam.isPublished && session.role !== SystemRole.SUPER_ADMIN && session.role !== SystemRole.SCHOOL_ADMIN) {
      return {
        success: false,
        error: 'Results for this exam have been published and locked. Unlock exam as Admin to make changes.',
      };
    }

    // Validation: Check max & min marks bounds for all entries
    for (const rec of records) {
      if (rec.marksObtained < 0 || rec.marksObtained > examSubject.maxMarks) {
        return {
          success: false,
          error: `Invalid marks (${rec.marksObtained}). Marks obtained must be between 0 and maximum allowed (${examSubject.maxMarks}).`,
        };
      }
    }


    const maxMarks = examSubject.maxMarks;

    const saved = await prisma.$transaction(async (tx) => {
      const results = [];
      for (const rec of records) {
        const percentage = (rec.marksObtained / maxMarks) * 100;
        const grade = calculateGrade(percentage);

        const res = await tx.examResult.upsert({
          where: {
            examSubjectId_studentId: {
              examSubjectId,
              studentId: rec.studentId,
            },
          },
          update: {
            marksObtained: rec.marksObtained,
            grade,
            remarks: rec.remarks || null,
          },
          create: {
            examSubjectId,
            studentId: rec.studentId,
            marksObtained: rec.marksObtained,
            grade,
            remarks: rec.remarks || null,
          },
        });
        results.push(res);
      }

      await tx.auditLog.create({
        data: {
          userId: session.userId,
          action: AuditAction.UPDATE,
          entity: 'ExamResult',
          entityId: examSubjectId,
          newValue: { count: results.length },
        },
      });

      return results;
    });

    revalidatePath('/dashboard/examinations/exams');
    return { success: true, count: saved.length };
  } catch (error) {
    console.error('Save marks error:', error);
    return { success: false, error: 'Failed to save student exam marks' };
  }
}

// ==========================================
// 4. PUBLISH / UNLOCK RESULTS
// ==========================================

export async function publishExamResultsAction(examId: string, isPublished: boolean) {
  const session = await requirePermission('results.publish');

  try {
    const exam = await prisma.exam.update({
      where: { id: examId },
      data: { isPublished },
      include: {
        examSubjects: {
          include: {
            examResults: {
              include: {
                student: { include: { user: { select: { id: true } } } },
              },
            },
          },
        },
      },
    });

    if (isPublished) {
      // Broadcast notifications to students
      const notifs: any[] = [];
      const studentIdsSet = new Set<string>();

      exam.examSubjects.forEach((es) => {
        es.examResults.forEach((er) => {
          if (!studentIdsSet.has(er.student.user.id)) {
            studentIdsSet.add(er.student.user.id);
            notifs.push({
              userId: er.student.user.id,
              title: 'Exam Results Published',
              message: `Official result report card for ${exam.name} is now published and available.`,
              linkUrl: '/dashboard/examinations/exams',
            });
          }
        });
      });

      if (notifs.length > 0) {
        await prisma.notification.createMany({ data: notifs });
      }
    }

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: AuditAction.UPDATE,
        entity: 'Exam',
        entityId: examId,
        newValue: { isPublished },
      },
    });

    revalidatePath('/dashboard/examinations/exams');
    return { success: true, isPublished: exam.isPublished };
  } catch (error) {
    console.error('Publish exam results error:', error);
    return { success: false, error: 'Failed to toggle exam publication status' };
  }
}

// ==========================================
// 5. REPORT CARD & RANKING ENGINE
// ==========================================

export async function getStudentReportCardAction(params: { studentId: string; examId: string }) {
  const session = await getSession();

  const student = await prisma.student.findUnique({
    where: { id: params.studentId },
    include: {
      user: { select: { fullName: true, email: true } },
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
    return { success: false, error: 'Student profile not found' };
  }

  const exam = await prisma.exam.findUnique({
    where: { id: params.examId },
    include: {
      session: { select: { name: true } },
      examSubjects: {
        include: {
          subject: { select: { id: true, name: true, code: true, classId: true } },
          examResults: true,
        },
      },
    },
  });

  if (!exam) {
    return { success: false, error: 'Exam record not found' };
  }

  // Access check: Students & Parents can only view PUBLISHED results
  if (
    !exam.isPublished &&
    (session?.role === SystemRole.STUDENT || session?.role === SystemRole.PARENT)
  ) {
    return { success: false, error: 'Results for this exam have not been published yet.' };
  }

  const currentEnrollment = student.enrollments[0];
  const classId = currentEnrollment?.class.id;

  // Filter exam subjects for student's class
  const relevantExamSubjects = exam.examSubjects.filter(
    (es) => es.subject.classId === classId || !classId
  );

  // Build subject breakdown for target student
  let totalMarksObtained = 0;
  let totalMaxMarks = 0;
  let isOverallPass = true;

  const subjectResults = relevantExamSubjects.map((es) => {
    const res = es.examResults.find((r) => r.studentId === params.studentId);
    const marksObtained = res ? res.marksObtained : 0;
    const isSubjectPass = marksObtained >= es.passingMarks;
    if (!isSubjectPass) isOverallPass = false;

    totalMarksObtained += marksObtained;
    totalMaxMarks += es.maxMarks;

    const percentage = es.maxMarks > 0 ? (marksObtained / es.maxMarks) * 100 : 0;

    return {
      subjectId: es.subject.id,
      subjectName: es.subject.name,
      subjectCode: es.subject.code,
      examDate: es.examDate,
      maxMarks: es.maxMarks,
      passingMarks: es.passingMarks,
      marksObtained,
      grade: res?.grade || calculateGrade(percentage),
      isPass: isSubjectPass,
      remarks: res?.remarks || (isSubjectPass ? 'Passed' : 'Needs Improvement'),
    };
  });

  // Calculate Overall Class Ranking/Position among enrolled peers
  const peerEnrollments = await prisma.enrollment.findMany({
    where: {
      classId: currentEnrollment?.class.id,
      deletedAt: null,
    },
    select: { studentId: true },
  });

  const peerTotals: Array<{ studentId: string; total: number }> = peerEnrollments.map((p) => {
    let peerSum = 0;
    relevantExamSubjects.forEach((es) => {
      const r = es.examResults.find((er) => er.studentId === p.studentId);
      if (r) peerSum += r.marksObtained;
    });
    return { studentId: p.studentId, total: peerSum };
  });

  peerTotals.sort((a, b) => b.total - a.total);
  const rankIndex = peerTotals.findIndex((p) => p.studentId === params.studentId);
  const positionRank = rankIndex !== -1 ? rankIndex + 1 : 1;

  const overallPercentage = totalMaxMarks > 0 ? Math.round((totalMarksObtained / totalMaxMarks) * 100) : 0;
  const overallGrade = calculateGrade(overallPercentage);

  return {
    success: true,
    reportCard: {
      examName: exam.name,
      sessionName: exam.session.name,
      isPublished: exam.isPublished,
      student: {
        fullName: student.user.fullName,
        admissionNo: student.admissionNo,
        rollNumber: student.rollNumber || 'N/A',
        className: currentEnrollment?.class.name || 'N/A',
        sectionName: currentEnrollment?.section.name || 'N/A',
      },
      subjectResults,
      summary: {
        totalMarksObtained,
        totalMaxMarks,
        overallPercentage,
        overallGrade,
        positionRank,
        totalClassStudents: peerEnrollments.length,
        resultStatus: isOverallPass ? 'PASS' : 'FAIL',
      },
    },
  };
}
