import React from 'react';
import { UserSession } from '@/types/auth';
import { UserNav } from './user-nav';
import { NotificationDropdown } from './notification-dropdown';
import { MobileSidebar } from './sidebar';
import { Search } from 'lucide-react';

interface NavbarProps {
  user: UserSession;
}

export function Navbar({ user }: NavbarProps) {
  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between px-4 sm:px-6 gap-3">
      {/* Mobile Drawer Trigger */}
      <div className="flex items-center gap-2">
        <MobileSidebar role={user.role} />
      </div>

      {/* Quick Search */}
      <div className="flex items-center gap-4 flex-1 max-w-md">
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search students, records..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-lg text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />
        </div>
      </div>

      {/* Right Navbar Actions */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Real-Time Notifications Dropdown */}
        <NotificationDropdown userId={user.userId} />

        <div className="h-5 w-px bg-slate-200 dark:bg-slate-800" />

        {/* User Account Nav */}
        <UserNav user={user} />
      </div>
    </header>
  );
}
