import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { SystemRole } from '@prisma/client';

export const runtime = 'nodejs';

const MANAGED_ROLES: SystemRole[] = [SystemRole.TEACHER, SystemRole.ACCOUNTANT, SystemRole.PARENT, SystemRole.STUDENT];

const PERMISSION_GROUPS: Array<{ group: string; codes: string[] }> = [
  { group: 'Portal Access', codes: ['portal.teacher', 'portal.accountant', 'portal.parent', 'portal.student'] },
  { group: 'Academic', codes: ['attendance.read', 'attendance.create', 'attendance.update', 'timetable.read', 'exams.read', 'marks.read', 'homework.read', 'homework.create', 'reports.read'] },
  { group: 'Finance', codes: ['fees.read', 'expenses.read', 'payroll.read'] },
  { group: 'Communication', codes: ['notices.read', 'messages.create'] },
];

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const isAdmin = session.role === SystemRole.SUPER_ADMIN || session.role === SystemRole.SCHOOL_ADMIN;
  if (!isAdmin) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });

  const url = new URL(req.url);
  const targetSchoolId = url.searchParams.get('schoolId');

  const schoolId =
    session.role === SystemRole.SUPER_ADMIN
      ? (targetSchoolId || session.schoolId || null)
      : (session.schoolId || null);

  if (!schoolId) return NextResponse.json({ success: false, error: 'No school selected' }, { status: 400 });

  const rows = await prisma.schoolRolePermission.findMany({
    where: { schoolId },
    select: { systemRole: true, permissionCode: true, allowed: true },
  });

  const denied: Record<string, string[]> = {};
  for (const r of MANAGED_ROLES) denied[r] = [];

  for (const row of rows) {
    if (!MANAGED_ROLES.includes(row.systemRole)) continue;
    if (row.allowed === false) denied[row.systemRole].push(row.permissionCode);
  }

  return NextResponse.json({
    success: true,
    schoolId,
    roles: MANAGED_ROLES,
    permissionGroups: PERMISSION_GROUPS,
    denied,
  });
}
