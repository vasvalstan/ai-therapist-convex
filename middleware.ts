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
  '/terms*',
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
    try {
      // Get the base URL from environment variables or request
      const baseUrl = process.env.FRONTEND_URL || process.env.FRONTEND_URL_DEV || req.nextUrl.origin;
      
      // Ensure we have a valid base URL
      if (!baseUrl) {
        throw new Error('No valid base URL found');
      }
      
      // Create the sign-in URL using the base URL
      const signInUrl = new URL('/sign-in', baseUrl);
      
      // Add the current path as a redirect URL
      if (path) {
        signInUrl.searchParams.set('redirect_url', path);
      }
      
      // Create the response with the absolute URL
      return NextResponse.redirect(signInUrl.toString());
    } catch (error) {
      console.error('Error creating redirect URL:', error);
      // Fallback to a simple redirect if URL construction fails
      return NextResponse.redirect('/sign-in');
    }
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