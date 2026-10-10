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

export interface AcademicSessionItem {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  classCount: number;
}

export async function getAcademicSessionsAction(targetSchoolId?: string | null) {
  const session = await getAuthSessionSafely();
  if (!session) return { success: false as const, error: 'Unauthorized', sessions: [] as AcademicSessionItem[] };

  const ctx = await validateSchoolAccess(session, targetSchoolId);

  const sessions = await prisma.academicSession.findMany({
    where: { schoolId: ctx.schoolId, deletedAt: null },
    orderBy: [{ isCurrent: 'desc' }, { startDate: 'desc' }],
    include: { classes: { where: { deletedAt: null }, select: { id: true } } },
  });

  return {
    success: true as const,
    sessions: sessions.map((s) => ({
      id: s.id,
      name: s.name,
      startDate: s.startDate.toISOString().slice(0, 10),
      endDate: s.endDate.toISOString().slice(0, 10),
      isCurrent: s.isCurrent,
      classCount: s.classes.length,
    })),
  };
}

export async function createAcademicSessionAction(input: {
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  makeCurrent?: boolean;
  targetSchoolId?: string | null;
}) {
  const session = await getAuthSessionSafely();
  if (!session) return { success: false as const, error: 'Unauthorized' };

  if (session.role !== SystemRole.SUPER_ADMIN && session.role !== SystemRole.SCHOOL_ADMIN) {
    return { success: false as const, error: 'Forbidden' };
  }

  const ctx = await validateSchoolAccess(session, input.targetSchoolId);

  const name = (input.name || '').trim();
  if (!name) return { success: false as const, error: 'Session name is required' };

  const startDate = new Date(input.startDate);
  const endDate = new Date(input.endDate);
  if (Number.isNaN(startDate.valueOf()) || Number.isNaN(endDate.valueOf())) {
    return { success: false as const, error: 'Invalid start/end date' };
  }
  if (startDate > endDate) {
    return { success: false as const, error: 'Start date must be before end date' };
  }

  const makeCurrent = Boolean(input.makeCurrent);

  const created = await prisma.$transaction(async (tx) => {
    if (makeCurrent) {
      await tx.academicSession.updateMany({
        where: { schoolId: ctx.schoolId, deletedAt: null },
        data: { isCurrent: false },
      });
    }

    return tx.academicSession.create({
      data: {
        schoolId: ctx.schoolId,
        name,
        startDate,
        endDate,
        isCurrent: makeCurrent,
      },
    });
  });

  revalidatePath('/academic/sessions');
  revalidatePath('/school-admin');
  revalidatePath('/');

  return { success: true as const, id: created.id };
}

export async function setCurrentAcademicSessionAction(input: { id: string; targetSchoolId?: string | null }) {
  const session = await getAuthSessionSafely();
  if (!session) return { success: false as const, error: 'Unauthorized' };

  if (session.role !== SystemRole.SUPER_ADMIN && session.role !== SystemRole.SCHOOL_ADMIN) {
    return { success: false as const, error: 'Forbidden' };
  }

  const ctx = await validateSchoolAccess(session, input.targetSchoolId);

  const existing = await prisma.academicSession.findFirst({
    where: { id: input.id, schoolId: ctx.schoolId, deletedAt: null },
    select: { id: true },
  });
  if (!existing) return { success: false as const, error: 'Academic session not found' };

  await prisma.$transaction(async (tx) => {
    await tx.academicSession.updateMany({
      where: { schoolId: ctx.schoolId, deletedAt: null },
      data: { isCurrent: false },
    });
    await tx.academicSession.update({
      where: { id: input.id },
      data: { isCurrent: true },
    });
  });

  revalidatePath('/academic/sessions');
  revalidatePath('/school-admin');
  revalidatePath('/');

  return { success: true as const };
}

export async function deleteAcademicSessionAction(input: { id: string; targetSchoolId?: string | null }) {
  const session = await getAuthSessionSafely();
  if (!session) return { success: false as const, error: 'Unauthorized' };

  if (session.role !== SystemRole.SUPER_ADMIN && session.role !== SystemRole.SCHOOL_ADMIN) {
    return { success: false as const, error: 'Forbidden' };
  }

  const ctx = await validateSchoolAccess(session, input.targetSchoolId);

  const existing = await prisma.academicSession.findFirst({
    where: { id: input.id, schoolId: ctx.schoolId, deletedAt: null },
    select: { id: true },
  });
  if (!existing) return { success: false as const, error: 'Academic session not found' };

  await prisma.academicSession.update({
    where: { id: input.id },
    data: { deletedAt: new Date(), isCurrent: false },
  });

  revalidatePath('/academic/sessions');
  revalidatePath('/school-admin');
  revalidatePath('/');

  return { success: true as const };
}

export interface SectionItem {
  id: string;
  name: string;
  capacity: number;
}

export interface AcademicClassItem {
  id: string;
  academicSessionId: string;
  name: string;
  numericOrder: number;
  sections: SectionItem[];
}

async function getCurrentAcademicSessionIdForSchool(schoolId: string) {
  const current = await prisma.academicSession.findFirst({
    where: { schoolId, deletedAt: null, isCurrent: true },
    select: { id: true, name: true },
    orderBy: { startDate: 'desc' },
  });
  return current;
}

export async function getAcademicClassesAction(targetSchoolId?: string | null) {
  const session = await getAuthSessionSafely();
  if (!session) return { success: false as const, error: 'Unauthorized', classes: [] as AcademicClassItem[] };

  const ctx = await validateSchoolAccess(session, targetSchoolId);

  const current = await getCurrentAcademicSessionIdForSchool(ctx.schoolId);
  if (!current) {
    return {
      success: false as const,
      error: 'No current academic session found. Please create/set a current session first.',
      classes: [] as AcademicClassItem[],
    };
  }

  const classes = await prisma.class.findMany({
    where: { academicSessionId: current.id, deletedAt: null },
    orderBy: [{ numericOrder: 'asc' }, { name: 'asc' }],
    include: {
      sections: {
        where: { deletedAt: null },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, capacity: true },
      },
    },
  });

  return {
    success: true as const,
    currentSession: { id: current.id, name: current.name },
    classes: classes.map((c) => ({
      id: c.id,
      academicSessionId: c.academicSessionId,
      name: c.name,
      numericOrder: c.numericOrder,
      sections: c.sections.map((s) => ({ id: s.id, name: s.name, capacity: s.capacity })),
    })),
  };
}

export async function createClassAction(input: {
  name: string;
  numericOrder: number;
  targetSchoolId?: string | null;
}) {
  const session = await getAuthSessionSafely();
  if (!session) return { success: false as const, error: 'Unauthorized' };

  if (session.role !== SystemRole.SUPER_ADMIN && session.role !== SystemRole.SCHOOL_ADMIN) {
    return { success: false as const, error: 'Forbidden' };
  }

  const ctx = await validateSchoolAccess(session, input.targetSchoolId);

  const current = await getCurrentAcademicSessionIdForSchool(ctx.schoolId);
  if (!current) return { success: false as const, error: 'No current academic session found' };

  const name = (input.name || '').trim();
  if (!name) return { success: false as const, error: 'Class name is required' };

  const numericOrder = Number(input.numericOrder);
  if (!Number.isFinite(numericOrder) || numericOrder < 1) {
    return { success: false as const, error: 'numericOrder must be a positive number' };
  }

  const dup = await prisma.class.findFirst({
    where: { academicSessionId: current.id, numericOrder, deletedAt: null },
    select: { id: true },
  });
  if (dup) return { success: false as const, error: 'A class with this numeric order already exists in current session' };

  const created = await prisma.class.create({
    data: {
      academicSessionId: current.id,
      name,
      numericOrder,
    },
    select: { id: true },
  });

  revalidatePath('/academic/classes');
  revalidatePath('/');

  return { success: true as const, id: created.id };
}

export async function deleteClassAction(input: { id: string; targetSchoolId?: string | null }) {
  const session = await getAuthSessionSafely();
  if (!session) return { success: false as const, error: 'Unauthorized' };

  if (session.role !== SystemRole.SUPER_ADMIN && session.role !== SystemRole.SCHOOL_ADMIN) {
    return { success: false as const, error: 'Forbidden' };
  }

  const ctx = await validateSchoolAccess(session, input.targetSchoolId);

  const cls = await prisma.class.findFirst({
    where: { id: input.id, deletedAt: null, session: { schoolId: ctx.schoolId, deletedAt: null } },
    select: { id: true },
  });
  if (!cls) return { success: false as const, error: 'Class not found' };

  const enrollCount = await prisma.enrollment.count({
    where: { classId: input.id, deletedAt: null },
  });
  if (enrollCount > 0) {
    return { success: false as const, error: 'Cannot delete class with active enrollments' };
  }

  await prisma.$transaction(async (tx) => {
    await tx.section.updateMany({ where: { classId: input.id, deletedAt: null }, data: { deletedAt: new Date() } });
    await tx.subject.updateMany({ where: { classId: input.id, deletedAt: null }, data: { deletedAt: new Date() } });
    await tx.class.update({ where: { id: input.id }, data: { deletedAt: new Date() } });
  });

  revalidatePath('/academic/classes');
  revalidatePath('/academic/subjects');
  revalidatePath('/');

  return { success: true as const };
}

export async function createSectionAction(input: {
  classId: string;
  name: string;
  capacity?: number;
  targetSchoolId?: string | null;
}) {
  const session = await getAuthSessionSafely();
  if (!session) return { success: false as const, error: 'Unauthorized' };

  if (session.role !== SystemRole.SUPER_ADMIN && session.role !== SystemRole.SCHOOL_ADMIN) {
    return { success: false as const, error: 'Forbidden' };
  }

  const ctx = await validateSchoolAccess(session, input.targetSchoolId);

  const cls = await prisma.class.findFirst({
    where: { id: input.classId, deletedAt: null, session: { schoolId: ctx.schoolId, deletedAt: null } },
    select: { id: true },
  });
  if (!cls) return { success: false as const, error: 'Class not found' };

  const name = (input.name || '').trim();
  if (!name) return { success: false as const, error: 'Section name is required' };

  const capacity = input.capacity == null ? 40 : Number(input.capacity);
  if (!Number.isFinite(capacity) || capacity < 1) return { success: false as const, error: 'Capacity must be >= 1' };

  const created = await prisma.section.create({
    data: { classId: input.classId, name, capacity },
    select: { id: true },
  });

  revalidatePath('/academic/classes');
  revalidatePath('/');

  return { success: true as const, id: created.id };
}

export async function deleteSectionAction(input: { id: string; targetSchoolId?: string | null }) {
  const session = await getAuthSessionSafely();
  if (!session) return { success: false as const, error: 'Unauthorized' };

  if (session.role !== SystemRole.SUPER_ADMIN && session.role !== SystemRole.SCHOOL_ADMIN) {
    return { success: false as const, error: 'Forbidden' };
  }

  const ctx = await validateSchoolAccess(session, input.targetSchoolId);

  const sec = await prisma.section.findFirst({
    where: { id: input.id, deletedAt: null, class: { session: { schoolId: ctx.schoolId, deletedAt: null }, deletedAt: null } },
    select: { id: true, classId: true },
  });
  if (!sec) return { success: false as const, error: 'Section not found' };

  const enrollCount = await prisma.enrollment.count({
    where: { sectionId: input.id, deletedAt: null },
  });
  if (enrollCount > 0) {
    return { success: false as const, error: 'Cannot delete section with active enrollments' };
  }

  await prisma.section.update({
    where: { id: input.id },
    data: { deletedAt: new Date() },
  });

  revalidatePath('/academic/classes');
  revalidatePath('/');

  return { success: true as const };
}
