export type MiddlewareRole =
  | 'SUPER_ADMIN'
  | 'SCHOOL_ADMIN'
  | 'TEACHER'
  | 'ACCOUNTANT'
  | 'PARENT'
  | 'STUDENT';

export const ROLE_DEFAULT_ROUTES: Record<MiddlewareRole, string> = {
  SUPER_ADMIN: '/dashboard/super-admin',
  SCHOOL_ADMIN: '/dashboard/school-admin',
  TEACHER: '/dashboard/teacher',
  ACCOUNTANT: '/dashboard/accountant',
  PARENT: '/dashboard/parent',
  STUDENT: '/dashboard/student',
};

export function getDefaultDashboard(role: MiddlewareRole): string {
  return ROLE_DEFAULT_ROUTES[role] || '/dashboard';
}

export function isAuthorizedRoute(
  pathname: string,
  role: MiddlewareRole
): boolean {
  if (role === 'SUPER_ADMIN') return true;

  if (pathname.startsWith('/dashboard/super-admin')) return false;

  if (
    pathname.startsWith('/dashboard/school-admin') &&
    role !== 'SCHOOL_ADMIN'
  ) {
    return false;
  }

  if (
    pathname.startsWith('/dashboard/teacher') &&
    !['SCHOOL_ADMIN', 'TEACHER'].includes(role)
  ) {
    return false;
  }

  if (
    pathname.startsWith('/dashboard/accountant') &&
    !['SCHOOL_ADMIN', 'ACCOUNTANT'].includes(role)
  ) {
    return false;
  }

  if (
    pathname.startsWith('/dashboard/parent') &&
    !['SCHOOL_ADMIN', 'PARENT'].includes(role)
  ) {
    return false;
  }

  if (
    pathname.startsWith('/dashboard/student') &&
    !['SCHOOL_ADMIN', 'STUDENT'].includes(role)
  ) {
    return false;
  }

  if (
    pathname.startsWith('/dashboard/finance') &&
    !['SCHOOL_ADMIN', 'ACCOUNTANT'].includes(role)
  ) {
    return false;
  }

  if (
    pathname.startsWith('/dashboard/users') &&
    role !== 'SCHOOL_ADMIN'
  ) {
    return false;
  }

  if (
    pathname.startsWith('/dashboard/settings') &&
    role !== 'SCHOOL_ADMIN'
  ) {
    return false;
  }

  return true;
}
