import { withAuth } from 'next-auth/middleware';

export const middleware = withAuth(
  function middleware(_request) {
    // Optionally add custom logic here for role-based protection
    return;
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Protect specific routes that require authentication
        const protectedPaths = ['/account', '/orders', '/cart'];
        const isProtectedPath = protectedPaths.some((path) =>
          req.nextUrl.pathname.startsWith(path),
        );

        if (isProtectedPath) {
          return !!token;
        }

        return true;
      },
    },
    pages: {
      signIn: '/auth/login',
    },
  },
);

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
