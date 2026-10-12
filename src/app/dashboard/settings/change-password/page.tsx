import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ChangePasswordClient from './ui';

export default async function ChangePasswordPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  return <ChangePasswordClient />;
}
