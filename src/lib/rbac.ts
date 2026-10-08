import { SystemRole } from '@prisma/client';
import { UserSession } from '@/types/auth';

export const ROLE_DEFAULT_ROUTES: Record<SystemRole, string> = {
  SUPER_ADMIN: '/dashboard/super-admin',
  SCHOOL_ADMIN: '/dashboard/school-admin',
  TEACHER: '/dashboard/teacher',
  ACCOUNTANT: '/dashboard/accountant',
  PARENT: '/dashboard/parent',
  STUDENT: '/dashboard/student',
};

export const ROLE_NAMES: Record<SystemRole, string> = {
  SUPER_ADMIN: 'Super Administrator',
  SCHOOL_ADMIN: 'School Administrator',
  TEACHER: 'Teacher',
  ACCOUNTANT: 'Accountant',
  PARENT: 'Parent',
  STUDENT: 'Student',
};

// Default Permission Matrix mapping by SystemRole
const ROLE_PERMISSIONS: Record<SystemRole, string[]> = {
  SUPER_ADMIN: ['*'],
  SCHOOL_ADMIN: [
    'students.read',
    'students.create',
    'students.update',
    'students.delete',
    'parents.read',
    'parents.create',
    'teachers.read',
    'teachers.create',
    'teachers.update',
    'classes.read',
    'classes.create',
    'classes.update',
    'attendance.read',
    'attendance.create',
    'attendance.update',
    'timetable.read',
    'timetable.update',
    'exams.read',
    'exams.create',
    'results.read',
    'results.publish',
    'fees.read',
    'fees.create',
    'fees.update',
    'expenses.read',
    'expenses.create',
    'payroll.read',
    'payroll.process',
    'homework.read',
    'notices.read',
    'notices.create',
    'reports.read',
    'settings.update',
    'auditlogs.read',
  ],
  TEACHER: [
    'students.read',
    'attendance.read',
    'attendance.create',
    'attendance.update',
    'timetable.read',
    'exams.read',
    'marks.read',
    'marks.create',
    'marks.update',
    'results.read',
    'homework.read',
    'homework.create',
    'homework.update',
    'homework.delete',
    'notices.read',
    'messages.create',
    'reports.read',
  ],
  ACCOUNTANT: [
    'students.read',
    'fees.read',
    'fees.create',
    'fees.update',
    'expenses.read',
    'expenses.create',
    'payroll.read',
    'payroll.process',
    'reports.read',
    'notices.read',
  ],
  PARENT: [
    'students.read',
    'attendance.read',
    'timetable.read',
    'fees.read',
    'results.read',
    'homework.read',
    'notices.read',
    'messages.create',
    'reports.read',
  ],
  STUDENT: [
    'students.read',
    'attendance.read',
    'timetable.read',
    'fees.read',
    'results.read',
    'homework.read',
    'homework.submit',
    'notices.read',
    'messages.create',
    'reports.read',
  ],
};

export function getDefaultDashboard(role: SystemRole): string {
  return ROLE_DEFAULT_ROUTES[role] || '/dashboard';
}

/**
 * Reusable permission check function: can(user, permissionCode)
 * Supports wildcard domain checks e.g., "students.*"
 */
export function can(user: UserSession | null, permission: string): boolean {
  if (!user) return false;

  // 1. Super Admin has unrestricted access
  if (user.role === 'SUPER_ADMIN') return true;

  const rolePerms = ROLE_PERMISSIONS[user.role] || [];
  const customPerms = user.permissions || [];
  const allUserPerms = Array.from(new Set([...rolePerms, ...customPerms]));

  if (allUserPerms.includes('*') || allUserPerms.includes(permission)) {
    return true;
  }

  // 2. Wildcard prefix check e.g. "students.*" matches "students.read"
  const [domain] = permission.split('.');
  if (allUserPerms.includes(`${domain}.*`)) {
    return true;
  }

  return false;
}

/**
 * Throws a Security Authorization error if the user lacks permission
 */
export function assertPermission(user: UserSession | null, permission: string): void {
  if (!can(user, permission)) {
    throw new Error(`Forbidden: Missing required permission [${permission}]`);
  }
}

/**
 * Pathname role guard helper for middleware
 */
export function isAuthorizedRoute(pathname: string, role: SystemRole): boolean {
  if (role === 'SUPER_ADMIN') return true;

  if (pathname.startsWith('/dashboard/super-admin')) {
    return false;
  }
  if (pathname.startsWith('/dashboard/school-admin') && role !== 'SCHOOL_ADMIN') {
    return false;
  }
  if (pathname.startsWith('/dashboard/teacher') && !['SCHOOL_ADMIN', 'TEACHER'].includes(role)) {
    return false;
  }
  if (pathname.startsWith('/dashboard/accountant') && !['SCHOOL_ADMIN', 'ACCOUNTANT'].includes(role)) {
    return false;
  }
  if (pathname.startsWith('/dashboard/parent') && !['SCHOOL_ADMIN', 'PARENT'].includes(role)) {
    return false;
  }
  if (pathname.startsWith('/dashboard/student') && !['SCHOOL_ADMIN', 'STUDENT'].includes(role)) {
    return false;
  }

  // Financial operational routes restriction
  if (pathname.startsWith('/dashboard/finance') && !['SCHOOL_ADMIN', 'ACCOUNTANT'].includes(role)) {
    return false;
  }

  // Users management restriction
  if (pathname.startsWith('/dashboard/users') && role !== 'SCHOOL_ADMIN') {
    return false;
  }

  // School settings restriction
  if (pathname.startsWith('/dashboard/settings') && role !== 'SCHOOL_ADMIN') {
    return false;
  }

  return true;
}
