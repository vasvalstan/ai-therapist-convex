import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Set runtime to nodejs
export const runtime = 'nodejs';

// This example protects all routes including api/trpc routes
// Please edit this to allow other routes to be public as needed.
// See https://clerk.com/docs/references/nextjs/auth-middleware for more information about configuring your middleware
export default clerkMiddleware(async (auth, req) => {
  // Check if the user is trying to access dashboard
  const isDashboard = req.nextUrl.pathname.startsWith('/dashboard');
  
  // If it's not a dashboard route, let the request through
  if (!isDashboard) {
    return NextResponse.next();
  }

  // If it's a dashboard route but user is not signed in, redirect to sign in
  const { userId } = await auth();
  if (!userId) {
    const signInUrl = new URL('/sign-in', req.nextUrl.origin);
    signInUrl.searchParams.set('redirect_url', req.nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Let the request through - subscription check will happen at the page level
  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};