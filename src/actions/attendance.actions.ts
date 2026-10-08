'use server';

import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth';
import { attendanceSheetSchema, AttendanceSheetValues } from '@/schemas/attendance.schema';
import { broadcastAttendanceUpdate } from '@/lib/realtime';
import { AttendanceStatus, AuditAction } from '@prisma/client';
import { revalidatePath } from 'next/cache';

export async function getAttendanceSheetAction(params: { sectionId: string; date: string }) {
  const session = await requirePermission('attendance.read');
  const targetDate = new Date(params.date);

  const section = await prisma.section.findUnique({
    where: { id: params.sectionId },
    include: {
      class: { select: { name: true } },
      enrollments: {
        where: { deletedAt: null },
        include: {
          student: {
            include: {
              user: { select: { fullName: true, email: true } },
              attendanceRecords: { select: { status: true } },
            },
          },
        },
        orderBy: { rollNumber: 'asc' },
      },
    },
  });

  if (!section) {
    return { success: false, error: 'Section record not found' };
  }

  // Retrieve existing attendance header for this date & section
  const existingAttendance = await prisma.attendance.findUnique({
    where: {
      sectionId_date: {
        sectionId: params.sectionId,
        date: targetDate,
      },
    },
    include: {
      records: true,
    },
  });

  const recordMap = new Map<string, { status: AttendanceStatus; remarks?: string | null }>();
  if (existingAttendance) {
    existingAttendance.records.forEach((r) => {
      recordMap.set(r.studentId, { status: r.status, remarks: r.remarks });
    });
  }

  // Calculate overall class & student rates
  const students = section.enrollments.map((e) => {
    const s = e.student;
    const totalRecs = s.attendanceRecords.length;
    const presentCount = s.attendanceRecords.filter(
      (r) => r.status === 'PRESENT' || r.status === 'LATE'
    ).length;
    const studentRate = totalRecs > 0 ? Math.round((presentCount / totalRecs) * 100) : 100;

    const existingStatus = recordMap.get(s.id)?.status || AttendanceStatus.PRESENT;
    const existingRemarks = recordMap.get(s.id)?.remarks || '';

    return {
      studentId: s.id,
      fullName: s.user.fullName,
      admissionNo: s.admissionNo,
      rollNumber: e.rollNumber || s.rollNumber || 'N/A',
      studentRate,
      currentStatus: existingStatus,
      currentRemarks: existingRemarks,
    };
  });

  let classAttendanceRate = 100;
  if (existingAttendance && existingAttendance.records.length > 0) {
    const presentTotal = existingAttendance.records.filter(
      (r) => r.status === 'PRESENT' || r.status === 'LATE'
    ).length;
    classAttendanceRate = Math.round((presentTotal / existingAttendance.records.length) * 100);
  }

  return {
    success: true,
    className: section.class.name,
    sectionName: section.name,
    isSavedBefore: Boolean(existingAttendance),
    classAttendanceRate,
    students,
  };
}

export async function saveAttendanceAction(values: AttendanceSheetValues) {
  const session = await requirePermission('attendance.create');
  const validation = attendanceSheetSchema.safeParse(values);

  if (!validation.success) {
    return {
      success: false,
      error: 'Validation failed',
      fieldErrors: validation.error.flatten().fieldErrors,
    };
  }

  const { sectionId, date, records } = validation.data;
  const targetDate = new Date(date);

  try {
    const result = await prisma.$transaction(async (tx: any) => {
      // 1. Upsert Attendance Header (prevents duplicate header records via @@unique([sectionId, date]))
      const attendanceHeader = await tx.attendance.upsert({
        where: {
          sectionId_date: {
            sectionId,
            date: targetDate,
          },
        },
        update: {
          recordedBy: session.userId,
        },
        create: {
          sectionId,
          date: targetDate,
          recordedBy: session.userId,
        },
      });

      // 2. Upsert Student Attendance Records atomically
      const notificationsToCreate: any[] = [];

      for (const rec of records) {
        await tx.attendanceRecord.upsert({
          where: {
            attendanceId_studentId: {
              attendanceId: attendanceHeader.id,
              studentId: rec.studentId,
            },
          },
          update: {
            status: rec.status,
            remarks: rec.remarks || null,
          },
          create: {
            attendanceId: attendanceHeader.id,
            studentId: rec.studentId,
            status: rec.status,
            remarks: rec.remarks || null,
          },
        });

        // 3. Trigger notification for ABSENT or EXCUSED students
        if (rec.status === AttendanceStatus.ABSENT || rec.status === AttendanceStatus.EXCUSED) {
          const studentProfile = await tx.student.findUnique({
            where: { id: rec.studentId },
            include: {
              user: { select: { id: true, fullName: true } },
              parents: { include: { parent: { select: { userId: true } } } },
            },
          });

          if (studentProfile) {
            // Student notification
            notificationsToCreate.push({
              userId: studentProfile.user.id,
              title: 'Attendance Alert',
              message: `You were marked ${rec.status} on ${date}.`,
              linkUrl: '/dashboard/attendance/student',
            });

            // Parent notification
            studentProfile.parents.forEach((p: any) => {
              notificationsToCreate.push({
                userId: p.parent.userId,
                title: 'Child Attendance Alert',
                message: `${studentProfile.user.fullName} was marked ${rec.status} on ${date}.`,
                linkUrl: '/dashboard/attendance/student',
              });
            });
          }
        }
      }

      // Create dispatched notifications
      if (notificationsToCreate.length > 0) {
        await tx.notification.createMany({
          data: notificationsToCreate,
        });
      }

      // 4. Audit Log Entry
      await tx.auditLog.create({
        data: {
          userId: session.userId,
          action: AuditAction.CREATE,
          entity: 'Attendance',
          entityId: attendanceHeader.id,
          newValue: { sectionId, date, totalRecords: records.length },
        },
      });

      return attendanceHeader;
    });

    // 5. Broadcast Real-time event for open browser tabs
    broadcastAttendanceUpdate(sectionId, date, {
      sectionId,
      date,
      updatedBy: session.fullName,
      recordsCount: records.length,
    });

    // 6. Revalidate cache for real-time dashboard updates
    revalidatePath('/dashboard/attendance/student');
    revalidatePath('/dashboard/school-admin');
    revalidatePath('/dashboard');

    return { success: true, attendance: result };
  } catch (error) {
    console.error('Save attendance transaction error:', error);
    return { success: false, error: 'Database transaction failed while saving attendance' };
  }
}

export async function getAttendanceHistoryAction(params: { sectionId?: string; limit?: number }) {
  await requirePermission('attendance.read');

  const history = await prisma.attendance.findMany({
    take: params.limit || 15,
    where: {
      ...(params.sectionId && { sectionId: params.sectionId }),
    },
    orderBy: { date: 'desc' },
    include: {
      section: {
        include: { class: { select: { name: true } } },
      },
      records: true,
    },
  });

  return {
    success: true,
    history: history.map((h) => {
      const total = h.records.length;
      const present = h.records.filter((r) => r.status === 'PRESENT' || r.status === 'LATE').length;
      const rate = total > 0 ? Math.round((present / total) * 100) : 0;
      return {
        id: h.id,
        date: h.date,
        className: h.section.class.name,
        sectionName: h.section.name,
        total,
        present,
        absent: total - present,
        rate,
      };
    }),
  };
}
