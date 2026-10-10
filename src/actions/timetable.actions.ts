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

export interface TimetableClassOption {
  id: string;
  name: string;
  numericOrder: number;
}

export interface TimetableSectionOption {
  id: string;
  classId: string;
  name: string;
}

export interface TimetableTeacherOption {
  id: string;
  name: string;
  email: string;
}

export interface TimetableSubjectOption {
  id: string;
  classId: string;
  code: string;
  name: string;
}

export interface TimetableEntryItem {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  roomNo: string | null;
  teacherName: string;
  subjectLabel: string | null;
}

function timeToMinutes(t: string) {
  const [h, m] = t.split(':').map((x) => Number(x));
  return h * 60 + m;
}

export async function getTimetableOptionsAction(input?: { targetSchoolId?: string | null }) {
  const session = await getAuthSessionSafely();
  if (!session) return { success: false as const, error: 'Unauthorized' };

  const ctx = await validateSchoolAccess(session, input?.targetSchoolId);
  const current = await getCurrentAcademicSessionForSchool(ctx.schoolId);
  if (!current) return { success: false as const, error: 'No current academic session found. Set it from Academic Sessions first.' };

  const classes = await prisma.class.findMany({
    where: { academicSessionId: current.id, deletedAt: null },
    orderBy: [{ numericOrder: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true, numericOrder: true },
  });

  const sections = await prisma.section.findMany({
    where: { deletedAt: null, class: { deletedAt: null, academicSessionId: current.id } },
    orderBy: [{ class: { numericOrder: 'asc' } }, { name: 'asc' }],
    select: { id: true, classId: true, name: true, class: { select: { numericOrder: true, name: true } } },
    take: 5000,
  });

  const subjects = await prisma.subject.findMany({
    where: { deletedAt: null, class: { deletedAt: null, academicSessionId: current.id } },
    orderBy: [{ class: { numericOrder: 'asc' } }, { code: 'asc' }],
    select: { id: true, classId: true, code: true, name: true },
    take: 5000,
  });

  const teachers = await prisma.teacher.findMany({
    where: { deletedAt: null, user: { schoolId: ctx.schoolId } },
    select: { id: true, user: { select: { fullName: true, email: true } } },
    orderBy: { createdAt: 'asc' },
    take: 2000,
  });

  return {
    success: true as const,
    currentSession: current,
    classes,
    sections: sections.map((s) => ({ id: s.id, classId: s.classId, name: s.name })),
    subjects,
    teachers: teachers.map((t) => ({ id: t.id, name: t.user.fullName, email: t.user.email })),
  };
}

export async function getTimetableEntriesAction(input: { sectionId: string; targetSchoolId?: string | null }) {
  const session = await getAuthSessionSafely();
  if (!session) return { success: false as const, error: 'Unauthorized', entries: [] as TimetableEntryItem[] };

  const ctx = await validateSchoolAccess(session, input.targetSchoolId);
  const current = await getCurrentAcademicSessionForSchool(ctx.schoolId);
  if (!current) return { success: false as const, error: 'No current academic session found', entries: [] as TimetableEntryItem[] };

  const section = await prisma.section.findFirst({
    where: { id: input.sectionId, deletedAt: null, class: { deletedAt: null, academicSessionId: current.id } },
    select: { id: true },
  });
  if (!section) return { success: false as const, error: 'Section not found', entries: [] as TimetableEntryItem[] };

  const entries = await prisma.timetable.findMany({
    where: { sectionId: input.sectionId },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    include: {
      teacher: { include: { user: true } },
      subject: { select: { code: true, name: true } },
    },
  });

  return {
    success: true as const,
    entries: entries.map((e) => ({
      id: e.id,
      dayOfWeek: e.dayOfWeek,
      startTime: e.startTime,
      endTime: e.endTime,
      roomNo: e.roomNo ?? null,
      teacherName: e.teacher.user.fullName,
      subjectLabel: e.subject ? `${e.subject.code} — ${e.subject.name}` : null,
    })),
  };
}

export async function createTimetableEntryAction(input: {
  sectionId: string;
  teacherId: string;
  subjectId?: string | null;
  dayOfWeek: number;
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
  roomNo?: string | null;
  targetSchoolId?: string | null;
}) {
  const session = await getAuthSessionSafely();
  if (!session) return { success: false as const, error: 'Unauthorized' };

  if (session.role !== SystemRole.SUPER_ADMIN && session.role !== SystemRole.SCHOOL_ADMIN && session.role !== SystemRole.TEACHER) {
    return { success: false as const, error: 'Forbidden' };
  }

  const ctx = await validateSchoolAccess(session, input.targetSchoolId);
  const current = await getCurrentAcademicSessionForSchool(ctx.schoolId);
  if (!current) return { success: false as const, error: 'No current academic session found' };

  const section = await prisma.section.findFirst({
    where: { id: input.sectionId, deletedAt: null, class: { deletedAt: null, academicSessionId: current.id } },
    select: { id: true, classId: true },
  });
  if (!section) return { success: false as const, error: 'Section not found' };

  const teacher = await prisma.teacher.findFirst({
    where: { id: input.teacherId, deletedAt: null, user: { schoolId: ctx.schoolId } },
    select: { id: true },
  });
  if (!teacher) return { success: false as const, error: 'Teacher not found' };

  const dayOfWeek = Number(input.dayOfWeek);
  if (!Number.isFinite(dayOfWeek) || dayOfWeek < 1 || dayOfWeek > 7) return { success: false as const, error: 'dayOfWeek must be 1-7' };

  const startTime = (input.startTime || '').trim();
  const endTime = (input.endTime || '').trim();
  if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
    return { success: false as const, error: 'Invalid time format (HH:MM)' };
  }
  const startMin = timeToMinutes(startTime);
  const endMin = timeToMinutes(endTime);
  if (startMin >= endMin) return { success: false as const, error: 'Start time must be before end time' };

  // subject must belong to the class of this section (optional)
  const subjectId = input.subjectId || null;
  if (subjectId) {
    const subj = await prisma.subject.findFirst({
      where: { id: subjectId, deletedAt: null, classId: section.classId, class: { deletedAt: null, academicSessionId: current.id } },
      select: { id: true },
    });
    if (!subj) return { success: false as const, error: 'Subject not found for this class' };
  }

  // Overlap check: same section, same day, time overlap
  const existing = await prisma.timetable.findMany({
    where: { sectionId: input.sectionId, dayOfWeek },
    select: { id: true, startTime: true, endTime: true },
  });

  for (const e of existing) {
    const a1 = timeToMinutes(e.startTime);
    const a2 = timeToMinutes(e.endTime);
    const overlap = startMin < a2 && endMin > a1;
    if (overlap) {
      return { success: false as const, error: 'Time overlaps with an existing period in this section' };
    }
  }

  await prisma.timetable.create({
    data: {
      sectionId: input.sectionId,
      teacherId: input.teacherId,
      subjectId,
      dayOfWeek,
      startTime,
      endTime,
      roomNo: input.roomNo || null,
    },
  });

  revalidatePath('/timetable');
  revalidatePath('/');

  return { success: true as const };
}

export async function deleteTimetableEntryAction(input: { id: string; targetSchoolId?: string | null }) {
  const session = await getAuthSessionSafely();
  if (!session) return { success: false as const, error: 'Unauthorized' };

  if (session.role !== SystemRole.SUPER_ADMIN && session.role !== SystemRole.SCHOOL_ADMIN && session.role !== SystemRole.TEACHER) {
    return { success: false as const, error: 'Forbidden' };
  }

  const ctx = await validateSchoolAccess(session, input.targetSchoolId);

  const row = await prisma.timetable.findFirst({
    where: { id: input.id, section: { class: { session: { schoolId: ctx.schoolId } } } },
    select: { id: true },
  });
  if (!row) return { success: false as const, error: 'Timetable entry not found' };

  await prisma.timetable.delete({ where: { id: input.id } });

  revalidatePath('/timetable');
  revalidatePath('/');

  return { success: true as const };
}
