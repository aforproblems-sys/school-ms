import { prisma } from '@/lib/prisma';
import { publishRealtimeEvent } from '@/lib/realtime';
import { dispatchExternalCommunication } from '@/lib/communication-dispatcher';
import { CommunicationChannel, SystemRole } from '@prisma/client';

export interface NotificationPayload {
  title: string;
  message: string;
  type?: string; // e.g. "NEW_NOTICE", "FEE_PAYMENT", "ATTENDANCE_ALERT", "HOMEWORK_ASSIGNED", "RESULT_PUBLISHED", "NEW_MESSAGE"
  linkUrl?: string;
}

/**
 * Send in-app and external (Email, WhatsApp, SMS) notifications to a single user
 */
export async function notifyUser(userId: string, payload: NotificationPayload) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { notificationPreference: true },
    });

    if (!user || !user.isActive || user.deletedAt) return null;

    const pref = user.notificationPreference;
    const inAppEnabled = pref ? pref.inAppEnabled : true;

    let notificationRecord = null;
    if (inAppEnabled) {
      notificationRecord = await prisma.notification.create({
        data: {
          userId,
          title: payload.title,
          message: payload.message,
          type: payload.type || 'GENERAL',
          linkUrl: payload.linkUrl || null,
        },
      });

      // Broadcast SSE event to user's real-time channel
      publishRealtimeEvent('notification:new', `user:${userId}`, {
        notificationId: notificationRecord.id,
        title: payload.title,
        message: payload.message,
        type: payload.type || 'GENERAL',
        linkUrl: payload.linkUrl,
        createdAt: notificationRecord.createdAt.toISOString(),
      });
    }

    // Queue External Communication Jobs (Non-blocking async dispatch)
    const commPayload = {
      to: user.email || user.phoneNumber || '',
      subject: payload.title,
      text: payload.message,
    };

    const options = {
      userId: user.id,
      messageType: payload.type || 'GENERAL',
      notificationId: notificationRecord?.id,
    };

    // Dispatch Email, WhatsApp, and SMS asynchronously
    Promise.allSettled([
      dispatchExternalCommunication(CommunicationChannel.EMAIL, commPayload, options),
      dispatchExternalCommunication(CommunicationChannel.WHATSAPP, commPayload, options),
      dispatchExternalCommunication(CommunicationChannel.SMS, commPayload, options),
    ]).catch((err) => console.error('Error dispatching external communications:', err));

    return notificationRecord;
  } catch (error) {
    console.error(`[Notification Service] Failed to notify user ${userId}:`, error);
    return null;
  }
}

/**
 * Send notifications to a list of user IDs
 */
export async function notifyUsers(userIds: string[], payload: NotificationPayload) {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
  return Promise.all(uniqueIds.map((id) => notifyUser(id, payload)));
}

/**
 * Send notifications to all active parents of specified students
 */
export async function notifyParentsOfStudents(studentIds: string[], payload: NotificationPayload) {
  if (!studentIds.length) return [];

  const studentParents = await prisma.studentParent.findMany({
    where: { studentId: { in: studentIds } },
    include: { parent: { select: { userId: true } } },
  });

  const parentUserIds = studentParents.map((sp) => sp.parent.userId).filter(Boolean);
  return notifyUsers(parentUserIds, payload);
}

/**
 * Send notifications to all active students & parents in a section
 */
export async function notifySection(sectionId: string, payload: NotificationPayload) {
  const enrollments = await prisma.enrollment.findMany({
    where: { sectionId, deletedAt: null },
    include: {
      student: {
        select: {
          userId: true,
          parents: { select: { parent: { select: { userId: true } } } },
        },
      },
    },
  });

  const userIds: string[] = [];
  enrollments.forEach((e) => {
    if (e.student.userId) userIds.push(e.student.userId);
    e.student.parents.forEach((p) => {
      if (p.parent.userId) userIds.push(p.parent.userId);
    });
  });

  return notifyUsers(userIds, payload);
}

/**
 * Send notifications to all active students & parents in a class
 */
export async function notifyClass(classId: string, payload: NotificationPayload) {
  const enrollments = await prisma.enrollment.findMany({
    where: { classId, deletedAt: null },
    include: {
      student: {
        select: {
          userId: true,
          parents: { select: { parent: { select: { userId: true } } } },
        },
      },
    },
  });

  const userIds: string[] = [];
  enrollments.forEach((e) => {
    if (e.student.userId) userIds.push(e.student.userId);
    e.student.parents.forEach((p) => {
      if (p.parent.userId) userIds.push(p.parent.userId);
    });
  });

  return notifyUsers(userIds, payload);
}

/**
 * Send notifications to all active teachers
 */
export async function notifyTeachers(payload: NotificationPayload) {
  const teachers = await prisma.user.findMany({
    where: { systemRole: SystemRole.TEACHER, isActive: true, deletedAt: null },
    select: { id: true },
  });

  return notifyUsers(teachers.map((t) => t.id), payload);
}

/**
 * Send notifications to all active students
 */
export async function notifyStudents(payload: NotificationPayload) {
  const students = await prisma.user.findMany({
    where: { systemRole: SystemRole.STUDENT, isActive: true, deletedAt: null },
    select: { id: true },
  });

  return notifyUsers(students.map((s) => s.id), payload);
}
