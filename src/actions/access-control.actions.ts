'use server';

import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { SystemRole } from '@prisma/client';

const ADMIN_ROLES: SystemRole[] = [SystemRole.SUPER_ADMIN, SystemRole.SCHOOL_ADMIN];

export const MANAGED_ROLES: SystemRole[] = [
  SystemRole.TEACHER,
  SystemRole.ACCOUNTANT,
  SystemRole.PARENT,
  SystemRole.STUDENT,
];

export const PERMISSION_GROUPS: Array<{ group: string; codes: string[] }> = [
  { group: 'Portal Access', codes: ['portal.teacher', 'portal.accountant', 'portal.parent', 'portal.student'] },
  { group: 'Academic', codes: ['attendance.read', 'attendance.create', 'attendance.update', 'timetable.read', 'exams.read', 'marks.read', 'homework.read', 'homework.create', 'reports.read'] },
  { group: 'Finance', codes: ['fees.read', 'expenses.read', 'payroll.read'] },
  { group: 'Communication', codes: ['notices.read', 'messages.create'] },
];

function resolveSchoolId(session: { role: SystemRole; schoolId?: string | null }, targetSchoolId?: string | null) {
  if (session.role === SystemRole.SUPER_ADMIN) return targetSchoolId || session.schoolId || null;
  return session.schoolId || null;
}

export async function listSchoolsAction() {
  const session = await getSession();
  if (!session) return { success: false as const, error: 'Unauthorized', schools: [] as any[] };
  if (session.role !== SystemRole.SUPER_ADMIN) return { success: false as const, error: 'Forbidden', schools: [] as any[] };

  const schools = await prisma.school.findMany({
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true, code: true },
    take: 200,
  });

  return { success: true as const, schools };
}

export async function getAccessMatrixAction(targetSchoolId?: string | null) {
  const session = await getSession();
  if (!session) return { success: false as const, error: 'Unauthorized' as const };
  if (!ADMIN_ROLES.includes(session.role)) return { success: false as const, error: 'Forbidden' as const };

  const schoolId = resolveSchoolId(session, targetSchoolId ?? null);
  if (!schoolId) return { success: false as const, error: 'No school selected' as const };

  const rows = await prisma.schoolRolePermission.findMany({
    where: { schoolId },
    select: { systemRole: true, permissionCode: true, allowed: true },
  });

  const denied: Record<string, Set<string>> = {};
  for (const r of MANAGED_ROLES) denied[r] = new Set();

  for (const row of rows) {
    if (!MANAGED_ROLES.includes(row.systemRole)) continue;
    if (row.allowed === false) denied[row.systemRole].add(row.permissionCode);
  }

  return {
    success: true as const,
    schoolId,
    roles: MANAGED_ROLES,
    permissionGroups: PERMISSION_GROUPS,
    denied: Object.fromEntries(Object.entries(denied).map(([k, v]) => [k, Array.from(v)])),
  };
}

export async function setRolePermissionAction(input: {
  targetSchoolId?: string | null;
  systemRole: SystemRole;
  permissionCode: string;
  enabled: boolean;
}) {
  const session = await getSession();
  if (!session) return { success: false as const, error: 'Unauthorized' };
  if (!ADMIN_ROLES.includes(session.role)) return { success: false as const, error: 'Forbidden' };

  if (!MANAGED_ROLES.includes(input.systemRole)) {
    return { success: false as const, error: 'Role not manageable here' };
  }

  const schoolId = resolveSchoolId(session, input.targetSchoolId ?? null);
  if (!schoolId) return { success: false as const, error: 'No school selected' };

  if (input.enabled) {
    await prisma.schoolRolePermission.deleteMany({
      where: { schoolId, systemRole: input.systemRole, permissionCode: input.permissionCode },
    });
    return { success: true as const };
  }

  await prisma.schoolRolePermission.upsert({
    where: {
      schoolId_systemRole_permissionCode: {
        schoolId,
        systemRole: input.systemRole,
        permissionCode: input.permissionCode,
      },
    },
    create: { schoolId, systemRole: input.systemRole, permissionCode: input.permissionCode, allowed: false },
    update: { allowed: false },
  });

  return { success: true as const };
}
