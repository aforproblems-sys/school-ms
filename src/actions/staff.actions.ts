'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSession, hashPassword } from '@/lib/auth';
import { SystemRole } from '@prisma/client';

const ADMIN_ROLES: SystemRole[] = [SystemRole.SUPER_ADMIN, SystemRole.SCHOOL_ADMIN];

const createSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(2),
  password: z.string().min(6),
  systemRole: z.enum(['TEACHER', 'ACCOUNTANT', 'SCHOOL_ADMIN']),
  phoneNumber: z.string().optional().nullable(),
  // Teacher fields
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

export async function listStaffAction() {
  const session = await getSession();
  if (!session) return { success: false as const, error: 'Unauthorized', staff: [] as StaffRow[] };

  // Only admins
  if (!ADMIN_ROLES.includes(session.role)) {
    return { success: false as const, error: 'Forbidden', staff: [] as StaffRow[] };
  }

  const schoolId = session.role === SystemRole.SUPER_ADMIN ? undefined : (session.schoolId ?? undefined);
  if (session.role !== SystemRole.SUPER_ADMIN && !schoolId) {
    return { success: false as const, error: 'Missing schoolId in session. Logout/login again.', staff: [] as StaffRow[] };
  }

  const staff = await prisma.user.findMany({
    where: {
      ...(schoolId ? { schoolId } : {}),
      systemRole: { in: [SystemRole.SCHOOL_ADMIN, SystemRole.TEACHER, SystemRole.ACCOUNTANT] },
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true, email: true, fullName: true, systemRole: true, isActive: true, createdAt: true },
    take: 300,
  });

  return {
    success: true as const,
    staff: staff.map((u) => ({
      ...u,
      createdAt: u.createdAt.toISOString(),
    })),
  };
}

export async function createStaffAction(input: unknown) {
  const session = await getSession();
  if (!session) return { success: false as const, error: 'Unauthorized' };

  if (!ADMIN_ROLES.includes(session.role)) {
    return { success: false as const, error: 'Forbidden' };
  }

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;

  // School Admin cannot create School Admin
  if (session.role !== SystemRole.SUPER_ADMIN && data.systemRole === 'SCHOOL_ADMIN') {
    return { success: false as const, error: 'Only Super Admin can create School Admin.' };
  }

  const schoolId =
    session.role === SystemRole.SUPER_ADMIN ? (session.schoolId ?? null) : (session.schoolId ?? null);

  if (!schoolId && data.systemRole !== 'SCHOOL_ADMIN') {
    return { success: false as const, error: 'No schoolId found for this admin. Logout/login again.' };
  }

  // Teacher profile required fields
  if (data.systemRole === 'TEACHER') {
    if (!data.employeeId || !data.qualification) {
      return { success: false as const, error: 'Teacher requires employeeId and qualification.' };
    }
  }

  const passwordHash = await hashPassword(data.password);

  try {
    const user = await prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash,
        fullName: data.fullName,
        phoneNumber: data.phoneNumber ?? null,
        systemRole: data.systemRole as SystemRole,
        schoolId: schoolId,
        isActive: true,
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

    return { success: true as const, user };
  } catch (e: any) {
    const msg = e?.message || 'Failed to create staff';
    return { success: false as const, error: msg };
  }
}
