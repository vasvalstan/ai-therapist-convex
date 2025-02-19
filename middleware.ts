import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

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
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};