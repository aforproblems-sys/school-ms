'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SystemRole } from '@prisma/client';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  CalendarCheck,
  Clock,
  FileSpreadsheet,
  Receipt,
  DollarSign,
  Wallet,
  BookMarked,
  Bell,
  MessageSquare,
  BarChart3,
  FileText,
  Database,
  Server,
  Settings,
  ShieldCheck,
  Building2,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: SystemRole[];
}

const NAV_ITEMS: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'ACCOUNTANT', 'PARENT', 'STUDENT'],
  },
  {
    title: 'User Management',
    href: '/dashboard/users/students',
    icon: Users,
    roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN'],
  },
  {
    title: 'Academic Sessions',
    href: '/dashboard/academic/sessions',
    icon: Building2,
    roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN'],
  },
  {
    title: 'Classes & Sections',
    href: '/dashboard/academic/classes',
    icon: GraduationCap,
    roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER'],
  },
  {
    title: 'Subjects',
    href: '/dashboard/academic/subjects',
    icon: BookOpen,
    roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER'],
  },
  {
    title: 'Attendance',
    href: '/dashboard/attendance/student',
    icon: CalendarCheck,
    roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'PARENT', 'STUDENT'],
  },
  {
    title: 'Timetable',
    href: '/dashboard/timetable',
    icon: Clock,
    roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'PARENT', 'STUDENT'],
  },
  {
    title: 'Exams & Marks',
    href: '/dashboard/examinations/exams',
    icon: FileSpreadsheet,
    roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'PARENT', 'STUDENT'],
  },
  {
    title: 'Fees & Invoices',
    href: '/dashboard/finance/fees',
    icon: Receipt,
    roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ACCOUNTANT', 'PARENT', 'STUDENT'],
  },
  {
    title: 'Expenses',
    href: '/dashboard/finance/expenses',
    icon: DollarSign,
    roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ACCOUNTANT'],
  },
  {
    title: 'Payroll',
    href: '/dashboard/finance/payroll',
    icon: Wallet,
    roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ACCOUNTANT'],
  },
  {
    title: 'Homework',
    href: '/dashboard/academic-work/homework',
    icon: BookMarked,
    roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'PARENT', 'STUDENT'],
  },
  {
    title: 'Announcements',
    href: '/announcements',
    icon: Bell,
    roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'ACCOUNTANT', 'PARENT', 'STUDENT'],
  },
  {
    title: 'Messaging',
    href: '/messages',
    icon: MessageSquare,
    roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'PARENT', 'STUDENT'],
  },
  {
    title: 'Notification Center',
    href: '/notifications',
    icon: Bell,
    roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'ACCOUNTANT', 'PARENT', 'STUDENT'],
  },
  {
    title: 'Notification Settings',
    href: '/settings/notifications',
    icon: Settings,
    roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'ACCOUNTANT', 'PARENT', 'STUDENT'],
  },
  {
    title: 'External Communication',
    href: '/settings/communication',
    icon: Settings,
    roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN'],
  },
  {
    title: 'Reports & Analytics',
    href: '/dashboard/reports',
    icon: BarChart3,
    roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ACCOUNTANT', 'TEACHER', 'PARENT', 'STUDENT'],
  },
  {
    title: 'Documents & PDFs',
    href: '/dashboard/documents',
    icon: FileText,
    roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ACCOUNTANT', 'TEACHER', 'PARENT', 'STUDENT'],
  },
  {
    title: 'Bulk Import & Export',
    href: '/dashboard/import-export',
    icon: Database,
    roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ACCOUNTANT', 'TEACHER'],
  },
  {
    title: 'School Settings',
    href: '/dashboard/settings',
    icon: Settings,
    roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN'],
  },
  {
    title: 'Platform Schools',
    href: '/super-admin/schools',
    icon: Building2,
    roles: ['SUPER_ADMIN'],
  },
  {
    title: 'Subscription & Billing',
    href: '/settings/subscription',
    icon: Receipt,
    roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN'],
  },
  {
    title: 'Platform Revenue & Billing',
    href: '/super-admin/billing',
    icon: BarChart3,
    roles: ['SUPER_ADMIN'],
  },
  {
    title: 'System Status & Backups',
    href: '/settings/system-status',
    icon: Server,
    roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN'],
  },
  {
    title: 'Audit Logs',
    href: '/dashboard/audit-logs',
    icon: ShieldCheck,
    roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN'],
  },
];

interface SidebarProps {
  role: SystemRole;
  userFullName: string;
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();

  const filteredItems = NAV_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <aside className="hidden md:flex w-64 h-screen sticky top-0 flex-col bg-slate-900 text-slate-200 border-r border-slate-800 shadow-xl z-30 shrink-0">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800/80 bg-slate-950/40 gap-3">
        <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white shadow-md shadow-indigo-500/20">
          SMS
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-tight text-white">EduManage Pro</h1>
          <p className="text-[11px] text-slate-400 font-medium">School System</p>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-150',
                isActive
                  ? 'bg-indigo-600/90 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              )}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={cn(
                    'w-4 h-4 transition-colors',
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                  )}
                />
                <span>{item.title}</span>
              </div>
              <ChevronRight
                className={cn(
                  'w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity',
                  isActive && 'opacity-100 text-white'
                )}
              />
            </Link>
          );
        })}
      </nav>

      {/* Footer System Badge */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/30">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-[11px] text-slate-400 font-mono">System Online v1.0</span>
        </div>
      </div>
    </aside>
  );
}

export function MobileSidebar({ role }: { role: SystemRole }) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const filteredItems = NAV_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <div className="md:hidden">
      {/* Mobile Hamburger Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        aria-label="Toggle Mobile Navigation"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Drawer Overlay & Sheet */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop Blur */}
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          {/* Drawer Panel */}
          <aside className="relative w-72 max-w-[80vw] h-full bg-slate-900 text-slate-200 shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
            {/* Header */}
            <div className="h-16 flex items-center justify-between px-5 border-b border-slate-800 bg-slate-950/40">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white text-xs">
                  SMS
                </div>
                <h2 className="text-sm font-bold text-white">EduManage Pro</h2>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation List */}
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
              {filteredItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/dashboard' && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      'group flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-medium transition-all',
                      isActive
                        ? 'bg-indigo-600 text-white font-semibold shadow-md'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={cn('w-4 h-4', isActive ? 'text-white' : 'text-slate-400')} />
                      <span>{item.title}</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-70" />
                  </Link>
                );
              })}
            </nav>

            <div className="p-4 border-t border-slate-800 bg-slate-950/40 text-[11px] text-slate-400 font-mono">
              EduManage Pro Mobile Nav
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
