import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionToken } from '@/lib/middleware-auth';
import { getDefaultDashboard, isAuthorizedRoute } from '@/lib/middleware-rbac';
import { getMaintenanceStatus, isRoleAllowedInMaintenance } from '@/lib/middleware-maintenance';

const PUBLIC_ROUTES = ['/login', '/forgot-password', '/unauthorized', '/forbidden', '/maintenance', '/api/health'];

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
