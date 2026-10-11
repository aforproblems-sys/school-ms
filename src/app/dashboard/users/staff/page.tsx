import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { SystemRole } from '@prisma/client';
import StaffClient from './staff-client';

export default async function StaffPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const allowedRoles =
    session.role === SystemRole.SUPER_ADMIN
      ? [SystemRole.SCHOOL_ADMIN, SystemRole.TEACHER, SystemRole.ACCOUNTANT]
      : [SystemRole.TEACHER, SystemRole.ACCOUNTANT];

  return <StaffClient allowedRoles={allowedRoles} />;
}
