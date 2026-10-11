import React from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { Sidebar } from '@/components/layout/sidebar';
import { Navbar } from '@/components/layout/navbar';

export const dynamic = 'force-dynamic';


export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 font-sans">
      {/* Sidebar Navigation */}
      <Sidebar role={session.role} userFullName={session.fullName} />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar user={session} />
        <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
