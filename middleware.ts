import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const publicRoutes = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)', // Allow webhook endpoints
  '/api/hume/token(.*)', // Allow Hume token endpoint
  '/blog(.*)', // If you have a public blog
  '/privacy(.*)', // Privacy policy
  '/terms(.*)', // Terms of service
  '/about(.*)', // About page
  '/contact(.*)', // Contact page
]);

export default clerkMiddleware(async (auth, req) => {
  if (publicRoutes(req)) {
    return NextResponse.next();
  }

  const session = await auth();
  if (!session.userId) {
    const signInUrl = new URL('/sign-in', req.url);
    signInUrl.searchParams.set('redirect_url', req.url);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
    '/(api|trpc)(.*)' // Match API and tRPC routes
  ]
};