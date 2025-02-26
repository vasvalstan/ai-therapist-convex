import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Set runtime to nodejs
export const runtime = 'nodejs';

const publicPaths = [
  '/',
  '/sign-in*',
  '/sign-up*',
  '/api/webhooks*', // Allow webhook endpoints
  '/api/hume/token*', // Allow Hume token endpoint
  '/blog*', // If you have a public blog
  '/privacy*', // Privacy policy
  '/terms*', // Terms of service
  '/about*', // About page
  '/contact*', // Contact page
];

const isPublic = (path: string) => {
  return publicPaths.find((x) =>
    path.match(new RegExp(`^${x.replace('*', '.*')}$`))
  );
};

// This example protects all routes including api/trpc routes
// Please edit this to allow other routes to be public as needed.
// See https://clerk.com/docs/references/nextjs/auth-middleware for more information about configuring your middleware
export default clerkMiddleware(async (auth, req) => {
  const path = req.nextUrl.pathname;
  
  // If the path is public, let the request through
  if (isPublic(path)) {
    return NextResponse.next();
  }

  // For all other routes, require authentication
  const { userId } = await auth();
  if (!userId) {
    const signInUrl = new URL('/sign-in', req.nextUrl.origin);
    signInUrl.searchParams.set('redirect_url', path);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/webhooks (webhook endpoints)
     * - api/hume/token (Hume token endpoint)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api/webhooks|api/hume/token|_next/static|_next/image|favicon.ico).*)'
  ]
};