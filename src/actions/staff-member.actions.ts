'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { SystemRole } from '@prisma/client';

const ADMIN_ROLES: SystemRole[] = [SystemRole.SUPER_ADMIN, SystemRole.SCHOOL_ADMIN];

const createSchema = z.object({
  fullName: z.string().min(2),
  designation: z.string().min(2),
  phoneNumber: z.string().optional().nullable(),
  monthlyPay: z.union([z.string(), z.number()]).optional().nullable(),
  joiningDate: z.string().optional().nullable(), // YYYY-MM-DD
  notes: z.string().optional().nullable(),
});

export type StaffMemberRow = {
  id: string;
  fullName: string;
  designation: string;
  phoneNumber: string | null;
  monthlyPay: string;
  joiningDate: string;
  isActive: boolean;
  createdAt: string;
};

export async function listStaffMembersAction() {
  const session = await getSession();
  if (!session) return { success: false as const, error: 'Unauthorized', staff: [] as StaffMemberRow[] };
  if (!ADMIN_ROLES.includes(session.role)) return { success: false as const, error: 'Forbidden', staff: [] as StaffMemberRow[] };

  if (session.role === SystemRole.SCHOOL_ADMIN && !session.schoolId) {
    return { success: false as const, error: 'Missing schoolId in session. Logout/login again.', staff: [] as StaffMemberRow[] };
  }

  const schoolId = session.role === SystemRole.SUPER_ADMIN ? session.schoolId : session.schoolId;
  if (!schoolId) return { success: false as const, error: 'No school selected for Super Admin.', staff: [] as StaffMemberRow[] };

  const staff = await prisma.staffMember.findMany({
    where: { schoolId },
    orderBy: { createdAt: 'desc' },
    take: 500,
  });

  return {
    success: true as const,
    staff: staff.map((s) => ({
      id: s.id,
      fullName: s.fullName,
      designation: s.designation,
      phoneNumber: s.phoneNumber ?? null,
      monthlyPay: String(s.monthlyPay),
      joiningDate: s.joiningDate.toISOString().slice(0, 10),
      isActive: s.isActive,
      createdAt: s.createdAt.toISOString(),
    })),
  };
}

export async function createStaffMemberAction(input: unknown) {
  const session = await getSession();
  if (!session) return { success: false as const, error: 'Unauthorized' };
  if (!ADMIN_ROLES.includes(session.role)) return { success: false as const, error: 'Forbidden' };

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors };
  }

  if (session.role === SystemRole.SCHOOL_ADMIN && !session.schoolId) {
    return { success: false as const, error: 'Missing schoolId in session. Logout/login again.' };
  }

  const schoolId = session.schoolId;
  if (!schoolId) return { success: false as const, error: 'No school selected for Super Admin.' };

  const d = parsed.data;
  const monthlyPay = d.monthlyPay == null || d.monthlyPay === '' ? '0.00' : String(d.monthlyPay);

  const staff = await prisma.staffMember.create({
    data: {
      schoolId,
      fullName: d.fullName,
      designation: d.designation,
      phoneNumber: d.phoneNumber ?? null,
      monthlyPay,
      joiningDate: d.joiningDate ? new Date(d.joiningDate) : new Date(),
      notes: d.notes ?? null,
      isActive: true,
    },
    select: { id: true },
  });

  return { success: true as const, id: staff.id };
}

export async function deactivateStaffMemberAction(id: string) {
  const session = await getSession();
  if (!session) return { success: false as const, error: 'Unauthorized' };
  if (!ADMIN_ROLES.includes(session.role)) return { success: false as const, error: 'Forbidden' };

  const staff = await prisma.staffMember.findUnique({ where: { id }, select: { id: true, schoolId: true } });
  if (!staff) return { success: false as const, error: 'Not found' };

  if (session.role === SystemRole.SCHOOL_ADMIN) {
    if (!session.schoolId) return { success: false as const, error: 'Missing schoolId in session. Logout/login again.' };
    if (staff.schoolId !== session.schoolId) return { success: false as const, error: 'Forbidden' };
  }

  await prisma.staffMember.update({
    where: { id },
    data: { isActive: false, deletedAt: new Date() },
  });

  return { success: true as const };
}
