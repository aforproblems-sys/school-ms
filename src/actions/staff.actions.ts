'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSession, hashPassword } from '@/lib/auth';
import { SystemRole } from '@prisma/client';
import { sendCredentialsEmail } from '@/lib/mailer';

const ADMIN_ROLES: SystemRole[] = [SystemRole.SUPER_ADMIN, SystemRole.SCHOOL_ADMIN];

const createSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(2),
  password: z.string().min(6),
  systemRole: z.enum(['TEACHER', 'ACCOUNTANT', 'SCHOOL_ADMIN']),
  phoneNumber: z.string().optional().nullable(),
  employeeId: z.string().optional().nullable(),
  qualification: z.string().optional().nullable(),
  joiningDate: z.string().optional().nullable(), // YYYY-MM-DD
});

export type StaffRow = {
  id: string;
  email: string;
  fullName: string;
  systemRole: SystemRole;
  isActive: boolean;
  createdAt: string;
};

function forbiddenStaffList() {
  return { success: false as const, error: 'Forbidden', staff: [] as StaffRow[] };
}

export async function listStaffAction() {
  const session = await getSession();
  if (!session) return { success: false as const, error: 'Unauthorized', staff: [] as StaffRow[] };
  if (!ADMIN_ROLES.includes(session.role)) return forbiddenStaffList();

  const schoolId = session.role === SystemRole.SUPER_ADMIN ? undefined : (session.schoolId ?? undefined);
  if (session.role !== SystemRole.SUPER_ADMIN && !schoolId) {
    return { success: false as const, error: 'Missing schoolId in session. Logout/login again.', staff: [] as StaffRow[] };
  }

  const staff = await prisma.user.findMany({
    where: {
      deletedAt: null,
      ...(schoolId ? { schoolId } : {}),
      systemRole: { in: [SystemRole.SCHOOL_ADMIN, SystemRole.TEACHER, SystemRole.ACCOUNTANT] },
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true, email: true, fullName: true, systemRole: true, isActive: true, createdAt: true },
    take: 300,
  });

  return {
    success: true as const,
    staff: staff.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() })),
  };
}

export async function createStaffAction(input: unknown) {
  const session = await getSession();
  if (!session) return { success: false as const, error: 'Unauthorized' };
  if (!ADMIN_ROLES.includes(session.role)) return { success: false as const, error: 'Forbidden' };

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const data = parsed.data;

  if (session.role !== SystemRole.SUPER_ADMIN && data.systemRole === 'SCHOOL_ADMIN') {
    return { success: false as const, error: 'Only Super Admin can create School Admin.' };
  }

  const schoolId = session.schoolId ?? null;
  if (!schoolId && data.systemRole !== 'SCHOOL_ADMIN') {
    return { success: false as const, error: 'No schoolId found for this admin. Logout/login again.' };
  }

  if (data.systemRole === 'TEACHER') {
    if (!data.employeeId || !data.qualification) {
      return { success: false as const, error: 'Teacher requires employeeId and qualification.' };
    }
  }

  const passwordHash = await hashPassword(data.password);

  const user = await prisma.user.create({
    data: {
      email: data.email.toLowerCase(),
      passwordHash,
      fullName: data.fullName,
      phoneNumber: data.phoneNumber ?? null,
      systemRole: data.systemRole as SystemRole,
      schoolId,
      isActive: true,
      deletedAt: null,
      ...(data.systemRole === 'TEACHER'
        ? {
            teacherProfile: {
              create: {
                employeeId: data.employeeId!,
                qualification: data.qualification!,
                joiningDate: data.joiningDate ? new Date(data.joiningDate) : new Date(),
              },
            },
          }
        : {}),
    },
    select: { id: true, email: true, fullName: true, systemRole: true },
  });

  // Send credentials email (best-effort)
  await sendCredentialsEmail({
    to: data.email.toLowerCase(),
    name: data.fullName,
    roleLabel: String(data.systemRole),
    username: data.email.toLowerCase(),
    password: data.password,
  }).catch((e) => console.error('EMAIL_SEND_FAILED_STAFF:', e?.message || e));

  return { success: true as const, user };
}

async function assertCanManage(session: any, userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, schoolId: true, systemRole: true, deletedAt: true },
  });
  if (!user || user.deletedAt) return { ok: false as const, error: 'User not found' };

  if (session.role === SystemRole.SCHOOL_ADMIN) {
    if (!session.schoolId) return { ok: false as const, error: 'Missing schoolId in session. Logout/login again.' };
    if (user.schoolId !== session.schoolId) return { ok: false as const, error: 'Forbidden (different school)' };
    if (user.systemRole === SystemRole.SCHOOL_ADMIN) return { ok: false as const, error: 'School Admin cannot manage School Admin' };
  }

  return { ok: true as const };
}

export async function deactivateStaffAction(userId: string) {
  const session = await getSession();
  if (!session) return { success: false as const, error: 'Unauthorized' };
  if (!ADMIN_ROLES.includes(session.role)) return { success: false as const, error: 'Forbidden' };

  const ok = await assertCanManage(session, userId);
  if (!ok.ok) return { success: false as const, error: ok.error };

  await prisma.user.update({ where: { id: userId }, data: { isActive: false } });
  return { success: true as const };
}

export async function activateStaffAction(userId: string) {
  const session = await getSession();
  if (!session) return { success: false as const, error: 'Unauthorized' };
  if (!ADMIN_ROLES.includes(session.role)) return { success: false as const, error: 'Forbidden' };

  const ok = await assertCanManage(session, userId);
  if (!ok.ok) return { success: false as const, error: ok.error };

  await prisma.user.update({ where: { id: userId }, data: { isActive: true, deletedAt: null } });
  return { success: true as const };
}

export async function deleteStaffAction(userId: string) {
  const session = await getSession();
  if (!session) return { success: false as const, error: 'Unauthorized' };
  if (!ADMIN_ROLES.includes(session.role)) return { success: false as const, error: 'Forbidden' };

  const ok = await assertCanManage(session, userId);
  if (!ok.ok) return { success: false as const, error: ok.error };

  // Soft delete (safe for relations)
  await prisma.user.update({ where: { id: userId }, data: { isActive: false, deletedAt: new Date() } });
  return { success: true as const };
}
