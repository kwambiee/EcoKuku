import { withAuth } from 'next-auth/middleware';
import { NextRequest, NextResponse } from 'next/server';

// Routes only Admin can access
const ADMIN_ONLY = ['/settings', '/reports', '/expenses'];

// Drivers can only access their logistics view
const DRIVER_ALLOWED = ['/logistics'];

export default withAuth(
  function middleware(request: NextRequest & { nextauth: any }) {
    const token = request.nextauth.token;
    const pathname = request.nextUrl.pathname;

    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const role = token.role as string;

    if (!['ADMIN', 'STAFF', 'DRIVER'].includes(role)) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('error', 'AccessDenied');
      return NextResponse.redirect(loginUrl);
    }

    // DRIVER can only see logistics
    if (role === 'DRIVER') {
      const allowed = DRIVER_ALLOWED.some((p) => pathname.startsWith(p));
      if (!allowed) {
        return NextResponse.redirect(new URL('/logistics', request.url));
      }
    }

    // STAFF cannot access admin-only routes
    if (role === 'STAFF') {
      const restricted = ADMIN_ONLY.some((p) => pathname.startsWith(p));
      if (restricted) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: '/login',
    },
  },
);

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|login).*)'],
};
