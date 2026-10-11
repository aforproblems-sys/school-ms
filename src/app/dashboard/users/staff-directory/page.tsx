import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { SystemRole } from '@prisma/client';
import StaffDirectoryClient from './staff-directory-client';

export default async function StaffDirectoryPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  if (session.role !== SystemRole.SUPER_ADMIN && session.role !== SystemRole.SCHOOL_ADMIN) {
    redirect('/forbidden');
  }

  return <StaffDirectoryClient />;
}
