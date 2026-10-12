import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionToken } from '@/lib/middleware-auth';
import { getDefaultDashboard, isAuthorizedRoute } from '@/lib/middleware-rbac';
import { getMaintenanceStatus, isRoleAllowedInMaintenance } from '@/lib/middleware-maintenance';

const PUBLIC_ROUTES = ['/login', '/forgot-password', '/reset-password', '/unauthorized', '/forbidden', '/maintenance', '/api/health'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('sms_session_token')?.value;
  const session = token ? await verifySessionToken(token) : null;
  console.log('MIDDLEWARE AUTH:', { pathname, hasToken: !!token, hasSession: !!session, role: session?.role });

  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
  const maintenanceStatus = getMaintenanceStatus();
  // 1. Maintenance Mode Interceptor
  if (maintenanceStatus.enabled && !pathname.startsWith('/maintenance') && !pathname.startsWith('/api/health')) {
    const isAllowedToBypass = session ? isRoleAllowedInMaintenance(session.role) : false;
    if (!isAllowedToBypass) {
      return NextResponse.redirect(new URL('/maintenance', request.url));
    }
  }

  // TEACHER RESTRICTIONS (block students + exams screens)
  if (session?.role === "TEACHER") {
    const blockedPrefixes = [
      "/dashboard/users/students",
      "/dashboard/examinations/exams",
    ];
    if (blockedPrefixes.some((p) => pathname.startsWith(p))) {
      return NextResponse.redirect(new URL("/forbidden", request.url));
    }
  }


  // 2. Unauthenticated user accessing protected dashboard route -> redirect to /login
  if (!session && !isPublicRoute && pathname.startsWith('/dashboard')) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 3. Authenticated user accessing login/forgot-password -> redirect to role dashboard
  if (session && (pathname === '/login' || pathname === '/forgot-password')) {
    return NextResponse.redirect(new URL(getDefaultDashboard(session.role), request.url));
  }

  // 4. Authenticated user accessing root / dashboard index -> redirect to role dashboard
  if (session && (pathname === '/' || pathname === '/dashboard')) {
    return NextResponse.redirect(new URL(getDefaultDashboard(session.role), request.url));
  }

  // TEACHER_BLOCKED_ROUTES
  // Teacher ko yahan se admin wali screens block kar rahe hain
  if (session?.role === 'TEACHER') {
    const blockedPrefixes = [
      '/dashboard/users/students',
      '/dashboard/examinations/exams',
    ];
    if (blockedPrefixes.some((p) => pathname.startsWith(p))) {
      return NextResponse.redirect(new URL('/forbidden', request.url));
    }
  }

  // 5. Portal Access Control (deny via session.permissions: "!portal.teacher" etc.)
  if (session && pathname.startsWith('/dashboard')) {
    const denied = new Set(
      (session.permissions || [])
        .filter((p) => typeof p === 'string' && p.startsWith('!'))
        .map((p) => p.slice(1))
    );

    const PORTAL_DENY_RULES: Array<[string, string]> = [
      ['portal.teacher', '/dashboard/teacher'],
      ['portal.accountant', '/dashboard/accountant'],
      ['portal.parent', '/dashboard/parent'],
      ['portal.student', '/dashboard/student'],
    ];

    for (const [perm, prefix] of PORTAL_DENY_RULES) {
      if (denied.has(perm) && pathname.startsWith(prefix)) {
        return NextResponse.redirect(new URL('/forbidden', request.url));
      }
    }
  }

  // 5a. Permission Route Denies (from Access Control via session.permissions: "!attendance.read" etc.)
  if (session && pathname.startsWith('/dashboard')) {
    const denied = new Set(
      (session.permissions || [])
        .filter((p) => typeof p === 'string' && p.startsWith('!'))
        .map((p) => p.slice(1))
    );

    const PERMISSION_DENY_ROUTE_RULES: Array<[string, string]> = [
      ['attendance.read', '/dashboard/attendance'],
      ['timetable.read', '/dashboard/timetable'],
      ['exams.read', '/dashboard/examinations'],
      ['marks.read', '/dashboard/examinations'],
      ['homework.read', '/dashboard/academic-work/homework'],
      ['fees.read', '/dashboard/finance/fees'],
      ['expenses.read', '/dashboard/finance/expenses'],
      ['payroll.read', '/dashboard/finance/payroll'],
      ['reports.read', '/dashboard/reports'],
      ['notices.read', '/dashboard/announcements'],
      ['messages.create', '/dashboard/messages'],
    ];

    for (const [perm, prefix] of PERMISSION_DENY_ROUTE_RULES) {
      if (denied.has(perm) && pathname.startsWith(prefix)) {
        return NextResponse.redirect(new URL('/forbidden', request.url));
      }
    }
  }

  // 5. Role Authorization Guard -> redirect to /forbidden if role is unauthorized
  if (session && pathname.startsWith('/dashboard')) {
    const isAllowed = isAuthorizedRoute(pathname, session.role);
    if (!isAllowed) {
      return NextResponse.redirect(new URL('/forbidden', request.url));
    }
  }

  // Prepare response with Production Security Headers
  const response = NextResponse.next();
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/webhooks).*)'],
};
