import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { SystemRole } from '@prisma/client';
import StaffDirectoryClient from './staff-directory-client';

export default async function StaffDirectoryPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  if (![SystemRole.SUPER_ADMIN, SystemRole.SCHOOL_ADMIN].includes(session.role)) {
    redirect('/forbidden');
  }

  return <StaffDirectoryClient />;
}
