import { withAuth } from 'next-auth/middleware';

export const middleware = withAuth(
  function middleware(req) {
    // Custom logic here if needed
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: '/auth/login',
    },
  }
);

// Only protect certain routes
export const config = {
  matcher: [
    '/browse/:path*',
    '/watch/:path*',
    '/profile/:path*',
    '/mylist/:path*',
    '/api/user/:path*',
    '/api/watch-progress/:path*',
    '/api/subscription/:path*',
  ],
};
