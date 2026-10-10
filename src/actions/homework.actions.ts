'use server';

import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { cookies } from 'next/headers';
import { SystemRole } from '@prisma/client';
import { validateSchoolAccess } from '@/lib/school-context';
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

async function getCurrentAcademicSessionForSchool(schoolId: string) {
  return prisma.academicSession.findFirst({
    where: { schoolId, deletedAt: null, isCurrent: true },
    select: { id: true, name: true },
    orderBy: { startDate: 'desc' },
  });
}

async function getTeacherIdForSessionUser(userId: string) {
  const t = await prisma.teacher.findFirst({
    where: { userId, deletedAt: null },
    select: { id: true },
  });
  return t?.id ?? null;
}

export interface TeacherOption {
  id: string;
  name: string;
  email: string;
}

export interface SubjectOption {
  id: string;
  classId: string;
  className: string;
  classNumericOrder: number;
  name: string;
  code: string;
}

export interface HomeworkItem {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  attachmentUrl: string | null;
  subjectId: string;
  subjectName: string;
  className: string;
  teacherName: string;
  createdAt: string;
}

export async function getHomeworkAction(input?: { targetSchoolId?: string | null }) {
  const session = await getAuthSessionSafely();
  if (!session) {
    return { success: false as const, error: 'Unauthorized', teachers: [] as TeacherOption[], subjects: [] as SubjectOption[], homeworks: [] as HomeworkItem[] };
  }

  const ctx = await validateSchoolAccess(session, input?.targetSchoolId);

  const current = await getCurrentAcademicSessionForSchool(ctx.schoolId);
  if (!current) {
    return { success: false as const, error: 'No current academic session found. Set it from Academic Sessions first.', teachers: [] as TeacherOption[], subjects: [] as SubjectOption[], homeworks: [] as HomeworkItem[] };
  }

  const teachers = await prisma.teacher.findMany({
    where: { deletedAt: null, user: { schoolId: ctx.schoolId } },
    select: { id: true, user: { select: { fullName: true, email: true } } },
    orderBy: { createdAt: 'asc' },
    take: 500,
  });

  const subjects = await prisma.subject.findMany({
    where: { deletedAt: null, class: { deletedAt: null, academicSessionId: current.id } },
    select: {
      id: true,
      classId: true,
      name: true,
      code: true,
      class: { select: { name: true, numericOrder: true } },
    },
    orderBy: [{ class: { numericOrder: 'asc' } }, { code: 'asc' }],
    take: 2000,
  });

  const homeworks = await prisma.homework.findMany({
    where: { deletedAt: null, subject: { deletedAt: null, class: { deletedAt: null, academicSessionId: current.id } } },
    include: {
      subject: { include: { class: true } },
      teacher: { include: { user: true } },
    },
    orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
    take: 500,
  });

  return {
    success: true as const,
    currentSession: current,
    teachers: teachers.map((t) => ({ id: t.id, name: t.user.fullName, email: t.user.email })),
    subjects: subjects.map((s) => ({
      id: s.id,
      classId: s.classId,
      className: s.class.name,
      classNumericOrder: s.class.numericOrder,
      name: s.name,
      code: s.code,
    })),
    homeworks: homeworks.map((h) => ({
      id: h.id,
      title: h.title,
      description: h.description,
      dueDate: h.dueDate.toISOString().slice(0, 10),
      attachmentUrl: h.attachmentUrl ?? null,
      subjectId: h.subjectId,
      subjectName: `${h.subject.code} — ${h.subject.name}`,
      className: `${h.subject.class.numericOrder}. ${h.subject.class.name}`,
      teacherName: h.teacher.user.fullName,
      createdAt: h.createdAt.toISOString(),
    })),
  };
}

export async function createHomeworkAction(input: {
  subjectId: string;
  teacherId?: string | null;
  title: string;
  description: string;
  dueDate: string; // YYYY-MM-DD
  attachmentUrl?: string | null;
  targetSchoolId?: string | null;
}) {
  const session = await getAuthSessionSafely();
  if (!session) return { success: false as const, error: 'Unauthorized' };

  // Teachers + Admins can create
  if (session.role !== SystemRole.SUPER_ADMIN && session.role !== SystemRole.SCHOOL_ADMIN && session.role !== SystemRole.TEACHER) {
    return { success: false as const, error: 'Forbidden' };
  }

  const ctx = await validateSchoolAccess(session, input.targetSchoolId);

  const current = await getCurrentAcademicSessionForSchool(ctx.schoolId);
  if (!current) return { success: false as const, error: 'No current academic session found' };

  const subject = await prisma.subject.findFirst({
    where: { id: input.subjectId, deletedAt: null, class: { deletedAt: null, academicSessionId: current.id, session: { schoolId: ctx.schoolId } } },
    select: { id: true },
  });
  if (!subject) return { success: false as const, error: 'Subject not found' };

  const title = (input.title || '').trim();
  const description = (input.description || '').trim();
  if (!title) return { success: false as const, error: 'Title is required' };
  if (!description) return { success: false as const, error: 'Description is required' };

  const dueDate = new Date(input.dueDate);
  if (Number.isNaN(dueDate.valueOf())) return { success: false as const, error: 'Invalid due date' };

  let teacherId = input.teacherId || null;

  if (session.role === SystemRole.TEACHER) {
    teacherId = await getTeacherIdForSessionUser(session.userId);
    if (!teacherId) return { success: false as const, error: 'Teacher profile not found for current user' };
  } else {
    if (!teacherId) return { success: false as const, error: 'Teacher is required' };
  }

  // verify teacher belongs to same school
  const teacher = await prisma.teacher.findFirst({
    where: { id: teacherId, deletedAt: null, user: { schoolId: ctx.schoolId } },
    select: { id: true },
  });
  if (!teacher) return { success: false as const, error: 'Teacher not found' };

  await prisma.homework.create({
    data: {
      subjectId: input.subjectId,
      teacherId,
      title,
      description,
      dueDate,
      attachmentUrl: input.attachmentUrl || null,
    },
  });

  revalidatePath('/academic-work/homework');
  revalidatePath('/');

  return { success: true as const };
}

export async function deleteHomeworkAction(input: { id: string; targetSchoolId?: string | null }) {
  const session = await getAuthSessionSafely();
  if (!session) return { success: false as const, error: 'Unauthorized' };

  const ctx = await validateSchoolAccess(session, input.targetSchoolId);

  const current = await getCurrentAcademicSessionForSchool(ctx.schoolId);
  if (!current) return { success: false as const, error: 'No current academic session found' };

  const hw = await prisma.homework.findFirst({
    where: { id: input.id, deletedAt: null, subject: { deletedAt: null, class: { deletedAt: null, academicSessionId: current.id, session: { schoolId: ctx.schoolId } } } },
    select: { id: true, teacherId: true },
  });
  if (!hw) return { success: false as const, error: 'Homework not found' };

  // Teachers can delete only their own homework; admins can delete any
  if (session.role === SystemRole.TEACHER) {
    const myTeacherId = await getTeacherIdForSessionUser(session.userId);
    if (!myTeacherId || myTeacherId !== hw.teacherId) return { success: false as const, error: 'Forbidden' };
  } else if (session.role !== SystemRole.SUPER_ADMIN && session.role !== SystemRole.SCHOOL_ADMIN) {
    return { success: false as const, error: 'Forbidden' };
  }

  await prisma.homework.update({
    where: { id: input.id },
    data: { deletedAt: new Date() },
  });

  revalidatePath('/academic-work/homework');
  revalidatePath('/');

  return { success: true as const };
}
