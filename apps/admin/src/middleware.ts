import { withAuth } from 'next-auth/middleware';
import { NextRequest } from 'next/server';

export const middleware = withAuth(
  function middleware(request: NextRequest & { nextauth: any }) {
    const token = request.nextauth.token;

    // Admin routes require ADMIN or STAFF role
    if (request.nextUrl.pathname.startsWith('/')) {
      if (!token) {
        return null; // withAuth will redirect to login
      }

      if (token.role !== 'ADMIN' && token.role !== 'STAFF') {
        // Redirect non-admin users to login
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('callbackUrl', request.url);
        return Response.redirect(loginUrl);
      }
    }
  },
  {
    callbacks: {
      authorized: ({ token }) => {
        return !!token;
      },
    },
    pages: {
      signIn: '/login',
    },
  },
);

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|login).*)'],
};
