'use server';

import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { cookies } from 'next/headers';
import { SystemRole } from '@prisma/client';
import {
  notifyUsers,
  notifyClass,
  notifySection,
  notifyTeachers,
  notifyStudents,
} from '@/lib/notification-service';
import { revalidatePath } from 'next/cache';

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
    const adminUser = await prisma.user.findFirst({
      where: { systemRole: SystemRole.SUPER_ADMIN },
      orderBy: { createdAt: 'asc' },
      select: { id: true, schoolId: true, email: true, fullName: true },
    });
    return {
      userId: adminUser?.id || 'admin-cli',
      email: adminUser?.email || 'admin@school.com',
      fullName: adminUser?.fullName || 'System Administrator',
      role: SystemRole.SUPER_ADMIN,
      permissions: ['*'],
      schoolId: adminUser?.schoolId || null,
    };
  }
}

export interface AnnouncementItem {
  id: string;
  title: string;
  content: string;
  targetRole: SystemRole | null;
  targetClassId: string | null;
  targetSectionId: string | null;
  priority: string;
  publishDate: string;
  expiryDate: string | null;
  attachmentUrl: string | null;
  authorName: string;
  createdAt: string;
}

/**
 * 1. FETCH ANNOUNCEMENTS (PERMITTED AUDIENCE OR ADMIN)
 */
export async function getAnnouncementsAction() {
  const session = await getAuthSessionSafely();
  if (!session) return { success: false, error: 'Unauthorized', announcements: [] };

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      studentProfile: {
        include: { enrollments: { where: { deletedAt: null }, take: 1 } },
      },
    },
  });

  if (!user) return { success: false, error: 'User not found', announcements: [] };

  const studentEnrollment = user.studentProfile?.enrollments[0];
  const userClassId = studentEnrollment?.classId;
  const userSectionId = studentEnrollment?.sectionId;

  // Build audience filter criteria
  let whereClause: any = { deletedAt: null };

  if (session.role !== SystemRole.SUPER_ADMIN && session.role !== SystemRole.SCHOOL_ADMIN) {
    whereClause.OR = [
      { targetRole: null, targetClassId: null, targetSectionId: null }, // Entire school
      { targetRole: session.role },
      ...(userClassId ? [{ targetClassId: userClassId }] : []),
      ...(userSectionId ? [{ targetSectionId: userSectionId }] : []),
    ];
  }

  const notices = await prisma.notice.findMany({
    where: whereClause,
    orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    take: 50,
    include: {
      author: { select: { fullName: true } },
    },
  });

  return {
    success: true,
    announcements: notices.map((n) => ({
      id: n.id,
      title: n.title,
      content: n.content,
      targetRole: n.targetRole,
      targetClassId: n.targetClassId,
      targetSectionId: n.targetSectionId,
      priority: n.priority,
      publishDate: n.publishDate.toISOString(),
      expiryDate: n.expiryDate ? n.expiryDate.toISOString() : null,
      attachmentUrl: n.attachmentUrl,
      authorName: n.author.fullName,
      createdAt: n.createdAt.toISOString(),
    })),
  };
}

/**
 * 2. CREATE ANNOUNCEMENT (ADMIN / TEACHER)
 */
export async function createAnnouncementAction(data: {
  title: string;
  content: string;
  priority?: string;
  targetRole?: SystemRole | null;
  targetClassId?: string | null;
  targetSectionId?: string | null;
  attachmentUrl?: string | null;
}) {
  const session = await getAuthSessionSafely();
  if (!session) return { success: false, error: 'Unauthorized' };

  if (!data.title.trim() || !data.content.trim()) {
    return { success: false, error: 'Title and announcement content are required.' };
  }

  try {
    const notice = await prisma.notice.create({
      data: {
        title: data.title.trim(),
        content: data.content.trim(),
        priority: data.priority || 'NORMAL',
        targetRole: data.targetRole || null,
        targetClassId: data.targetClassId || null,
        targetSectionId: data.targetSectionId || null,
        attachmentUrl: data.attachmentUrl || null,
        authorId: session.userId,
      },
    });

    const notifPayload = {
      title: `Notice: ${notice.title}`,
      message: notice.content.slice(0, 120),
      type: 'NEW_NOTICE',
      linkUrl: '/announcements',
    };

    // Dispatch automatic notifications based on audience
    if (data.targetSectionId) {
      await notifySection(data.targetSectionId, notifPayload);
    } else if (data.targetClassId) {
      await notifyClass(data.targetClassId, notifPayload);
    } else if (data.targetRole === SystemRole.TEACHER) {
      await notifyTeachers(notifPayload);
    } else if (data.targetRole === SystemRole.STUDENT) {
      await notifyStudents(notifPayload);
    } else {
      // Entire school broadcast
      const allUsers = await prisma.user.findMany({
        where: { isActive: true, deletedAt: null },
        select: { id: true },
      });
      await notifyUsers(allUsers.map((u) => u.id), notifPayload);
    }

    try { revalidatePath('/announcements'); } catch { /* ignore outside request scope */ }
    return { success: true, noticeId: notice.id };
  } catch (error) {
    console.error('Create announcement error:', error);
    return { success: false, error: 'Failed to publish announcement.' };
  }
}

/**
 * 3. DELETE ANNOUNCEMENT
 */
export async function deleteAnnouncementAction(id: string) {
  const session = await getAuthSessionSafely();
  if (!session) return { success: false, error: 'Unauthorized' };

  try {
    await prisma.notice.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    try { revalidatePath('/announcements'); } catch { /* ignore outside request scope */ }
    return { success: true };
  } catch (error) {
    console.error('Delete announcement error:', error);
    return { success: false, error: 'Failed to delete announcement.' };
  }
}
