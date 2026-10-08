'use server';

import { prisma } from '@/lib/prisma';
import { assertPermission } from '@/lib/rbac';
import { requirePermission } from '@/lib/auth';
import { studentFormSchema, StudentFormValues } from '@/schemas/student.schema';
import { hashPassword } from '@/lib/auth';
import { AuditAction, Gender, SystemRole } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { broadcastStudentChange } from '@/lib/realtime';

export interface StudentFilterParams {
  page?: number;
  limit?: number;
  search?: string;
  classId?: string;
  sectionId?: string;
  gender?: Gender;
}

export async function getStudentsAction(params: StudentFilterParams = {}) {
  const session = await requirePermission('students.read');
  const page = Math.max(1, params.page || 1);
  const limit = Math.max(1, Math.min(100, params.limit || 10));
  const skip = (page - 1) * limit;

  const whereClause: any = {
    deletedAt: null,
  };

  if (params.search && params.search.trim() !== '') {
    const term = params.search.trim();
    whereClause.OR = [
      { user: { fullName: { contains: term, mode: 'insensitive' } } },
      { user: { email: { contains: term, mode: 'insensitive' } } },
      { admissionNo: { contains: term, mode: 'insensitive' } },
      { rollNumber: { contains: term, mode: 'insensitive' } },
    ];
  }

  if (params.gender) {
    whereClause.gender = params.gender;
  }

  if (params.classId || params.sectionId) {
    whereClause.enrollments = {
      some: {
        ...(params.classId && { classId: params.classId }),
        ...(params.sectionId && { sectionId: params.sectionId }),
        deletedAt: null,
      },
    };
  }

  const [total, students] = await Promise.all([
    prisma.student.count({ where: whereClause }),
    prisma.student.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true,
            avatarUrl: true,
            isActive: true,
          },
        },
        enrollments: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: {
            class: { select: { id: true, name: true } },
            section: { select: { id: true, name: true } },
          },
        },
        parents: {
          include: {
            parent: {
              include: {
                user: { select: { fullName: true, phoneNumber: true } },
              },
            },
          },
        },
      },
    }),
  ]);

  return {
    success: true,
    students,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getStudentByIdAction(studentId: string) {
  const session = await requirePermission('students.read');

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phoneNumber: true,
          avatarUrl: true,
          isActive: true,
          createdAt: true,
        },
      },
      enrollments: {
        orderBy: { createdAt: 'desc' },
        include: {
          session: { select: { name: true, isCurrent: true } },
          class: { select: { name: true } },
          section: { select: { name: true } },
        },
      },
      parents: {
        include: {
          parent: {
            include: {
              user: { select: { fullName: true, email: true, phoneNumber: true } },
            },
          },
        },
      },
      attendanceRecords: {
        take: 30,
        orderBy: { createdAt: 'desc' },
      },
      studentFees: {
        include: {
          feeStructure: { select: { name: true } },
          payments: true,
        },
      },
      examResults: {
        include: {
          examSubject: {
            include: {
              exam: { select: { name: true } },
              subject: { select: { name: true, code: true } },
            },
          },
        },
      },
    },
  });

  if (!student || student.deletedAt) {
    return { success: false, error: 'Student record not found' };
  }

  // Attendance summary calculations
  const totalAttendance = student.attendanceRecords.length;
  const presentCount = student.attendanceRecords.filter(
    (a: any) => a.status === 'PRESENT' || a.status === 'LATE'
  ).length;
  const attendanceRate = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 100;

  // Fee summary calculations
  const totalInvoiced = student.studentFees.reduce((acc: number, f: any) => acc + Number(f.amount), 0);
  const totalPaid = student.studentFees.reduce((acc: number, f: any) => acc + Number(f.paidAmount), 0);
  const pendingBalance = Math.max(0, totalInvoiced - totalPaid);

  return {
    success: true,
    student,
    summary: {
      attendanceRate,
      totalAttendance,
      presentCount,
      totalInvoiced,
      totalPaid,
      pendingBalance,
    },
  };
}

export async function createStudentAction(values: StudentFormValues) {
  const session = await requirePermission('students.create');
  const validation = studentFormSchema.safeParse(values);

  if (!validation.success) {
    return {
      success: false,
      error: 'Validation failed',
      fieldErrors: validation.error.flatten().fieldErrors,
    };
  }

  const data = validation.data;

  try {
    // Check if admission number or email exists
    const existingAdmission = await prisma.student.findUnique({
      where: { admissionNo: data.admissionNo },
    });
    if (existingAdmission) {
      return { success: false, error: 'Admission number already exists in system' };
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });
    if (existingUser) {
      return { success: false, error: 'Email address is already registered' };
    }

    // Get current active session
    const currentSession = await prisma.academicSession.findFirst({
      where: { isCurrent: true, deletedAt: null },
    });
    if (!currentSession) {
      return { success: false, error: 'No active academic session found' };
    }

    // Check school subscription student quota limit server-side
    if (session.schoolId) {
      const { checkSubscriptionLimit } = await import('@/lib/school-context');
      const quotaCheck = await checkSubscriptionLimit(session.schoolId, 'STUDENTS');
      if (!quotaCheck.allowed) {
        return {
          success: false,
          error: quotaCheck.error || 'Subscription Plan Limit Reached: Cannot enroll additional students.',
        };
      }
    }

    const defaultPasswordHash = await hashPassword('Password123!');


    const result = await prisma.$transaction(async (tx: any) => {
      // 1. Create Student User
      const user = await tx.user.create({
        data: {
          email: data.email.toLowerCase(),
          passwordHash: defaultPasswordHash,
          fullName: data.fullName,
          phoneNumber: data.phoneNumber || null,
          avatarUrl: data.avatarUrl || null,
          systemRole: SystemRole.STUDENT,
          schoolId: session.schoolId || null,
        },
      });

      // 2. Create Student Profile
      const student = await tx.student.create({
        data: {
          userId: user.id,
          admissionNo: data.admissionNo,
          rollNumber: data.rollNumber || null,
          dateOfBirth: new Date(data.dateOfBirth),
          gender: data.gender,
          bloodGroup: data.bloodGroup || null,
          address: data.address,
        },
      });

      // 3. Create Guardian Parent User & Profile if provided
      let parentUser = await tx.user.findFirst({
        where: {
          email: data.guardianEmail && data.guardianEmail !== '' ? data.guardianEmail.toLowerCase() : `guardian.${data.admissionNo.toLowerCase()}@school.com`,
        },
      });

      if (!parentUser) {
        parentUser = await tx.user.create({
          data: {
            email: data.guardianEmail && data.guardianEmail !== '' ? data.guardianEmail.toLowerCase() : `guardian.${data.admissionNo.toLowerCase()}@school.com`,
            passwordHash: defaultPasswordHash,
            fullName: data.guardianName,
            phoneNumber: data.guardianPhone,
            systemRole: SystemRole.PARENT,
            schoolId: session.schoolId || null,
            parentProfile: {
              create: {
                occupation: data.guardianOccupation || 'Guardian',
              },
            },
          },
          include: { parentProfile: true },
        });
      }

      const parentProfile = await tx.parent.findUnique({
        where: { userId: parentUser.id },
      });

      if (parentProfile) {
        await tx.studentParent.create({
          data: {
            studentId: student.id,
            parentId: parentProfile.id,
            relationship: data.relationship,
          },
        });
      }

      // 4. Create Academic Enrollment Record
      await tx.enrollment.create({
        data: {
          studentId: student.id,
          academicSessionId: currentSession.id,
          classId: data.classId,
          sectionId: data.sectionId,
          rollNumber: data.rollNumber || null,
        },
      });

      // 5. Audit Logging
      await tx.auditLog.create({
        data: {
          userId: session.userId,
          action: AuditAction.CREATE,
          entity: 'Student',
          entityId: student.id,
          newValue: { fullName: data.fullName, admissionNo: data.admissionNo },
        },
      });

      return student;
    });

    broadcastStudentChange('create', result.id, { fullName: data.fullName });
    revalidatePath('/dashboard/users/students');
    return { success: true, student: result };
  } catch (error) {
    console.error('Create student transaction error:', error);
    return { success: false, error: 'Failed to create student record in database' };
  }
}

export async function updateStudentAction(studentId: string, values: Partial<StudentFormValues>) {
  const session = await requirePermission('students.update');

  try {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { user: true },
    });

    if (!student) {
      return { success: false, error: 'Student record not found' };
    }

    await prisma.$transaction(async (tx: any) => {
      if (values.fullName || values.email || values.phoneNumber) {
        await tx.user.update({
          where: { id: student.userId },
          data: {
            ...(values.fullName && { fullName: values.fullName }),
            ...(values.email && { email: values.email.toLowerCase() }),
            ...(values.phoneNumber && { phoneNumber: values.phoneNumber }),
          },
        });
      }

      await tx.student.update({
        where: { id: studentId },
        data: {
          ...(values.dateOfBirth && { dateOfBirth: new Date(values.dateOfBirth) }),
          ...(values.gender && { gender: values.gender }),
          ...(values.address && { address: values.address }),
          ...(values.rollNumber && { rollNumber: values.rollNumber }),
        },
      });

      await tx.auditLog.create({
        data: {
          userId: session.userId,
          action: AuditAction.UPDATE,
          entity: 'Student',
          entityId: studentId,
        },
      });
    });

    revalidatePath('/dashboard/users/students');
    return { success: true };
  } catch (error) {
    console.error('Update student error:', error);
    return { success: false, error: 'Failed to update student record' };
  }
}

export async function deleteStudentAction(studentId: string) {
  const session = await requirePermission('students.delete');

  try {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      return { success: false, error: 'Student not found' };
    }

    const now = new Date();
    await prisma.$transaction(async (tx: any) => {
      // Soft Delete Student Record
      await tx.student.update({
        where: { id: studentId },
        data: { deletedAt: now },
      });

      // Deactivate User Account
      await tx.user.update({
        where: { id: student.userId },
        data: { isActive: false, deletedAt: now },
      });

      await tx.auditLog.create({
        data: {
          userId: session.userId,
          action: AuditAction.DELETE,
          entity: 'Student',
          entityId: studentId,
        },
      });
    });

    revalidatePath('/dashboard/users/students');
    return { success: true };
  } catch (error) {
    console.error('Delete student error:', error);
    return { success: false, error: 'Failed to archive student record' };
  }
}

export async function getClassOptionsAction() {
  await requirePermission('students.read');
  const classes = await prisma.class.findMany({
    where: { deletedAt: null },
    include: {
      sections: {
        where: { deletedAt: null },
        select: { id: true, name: true },
      },
    },
    orderBy: { numericOrder: 'asc' },
  });

  return { success: true, classes };
}
