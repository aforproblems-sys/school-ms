import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { SystemRole } from '@prisma/client';

export const runtime = 'nodejs';

const MANAGED_ROLES: SystemRole[] = [SystemRole.TEACHER, SystemRole.ACCOUNTANT, SystemRole.PARENT, SystemRole.STUDENT];

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const isAdmin = session.role === SystemRole.SUPER_ADMIN || session.role === SystemRole.SCHOOL_ADMIN;
  if (!isAdmin) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });

  const systemRole = body.systemRole as SystemRole;
  const permissionCode = String(body.permissionCode || '');
  const enabled = Boolean(body.enabled);
  const targetSchoolId = body.schoolId ? String(body.schoolId) : null;

  if (!MANAGED_ROLES.includes(systemRole)) {
    return NextResponse.json({ success: false, error: 'Role not manageable' }, { status: 400 });
  }
  if (!permissionCode) {
    return NextResponse.json({ success: false, error: 'permissionCode required' }, { status: 400 });
  }

  const schoolId =
    session.role === SystemRole.SUPER_ADMIN
      ? (targetSchoolId || session.schoolId || null)
      : (session.schoolId || null);

  if (!schoolId) return NextResponse.json({ success: false, error: 'No school selected' }, { status: 400 });

  if (enabled) {
    await prisma.schoolRolePermission.deleteMany({
      where: { schoolId, systemRole, permissionCode },
    });
    return NextResponse.json({ success: true });
  }

  await prisma.schoolRolePermission.upsert({
    where: {
      schoolId_systemRole_permissionCode: { schoolId, systemRole, permissionCode },
    },
    create: { schoolId, systemRole, permissionCode, allowed: false },
    update: { allowed: false },
  });

  return NextResponse.json({ success: true });
}
