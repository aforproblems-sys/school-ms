import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getDefaultDashboard } from '@/lib/rbac';

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }
  redirect(getDefaultDashboard(session.role));
}
