import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { SystemRole } from '@prisma/client';
import AccessControlClient from './ui';

export default async function AccessControlPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  if (session.role !== SystemRole.SUPER_ADMIN && session.role !== SystemRole.SCHOOL_ADMIN) {
    redirect('/forbidden');
  }

  return <AccessControlClient isSuperAdmin={session.role === SystemRole.SUPER_ADMIN} />;
}
