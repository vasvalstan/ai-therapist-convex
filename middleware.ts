import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { fetchQuery } from 'convex/nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { api } from './convex/_generated/api';

// Define protected routes that require authentication and subscription
const isProtectedRoute = createRouteMatcher([
  '/chat(.*)',
  '/api/hume/:path*', // Protect all Hume API routes
]);

// Define public routes that don't require authentication
const publicPaths = [
  '/',
  '/sign-in*',
  '/sign-up*',
  '/api/webhooks*',
  '/api/hume/token*', // This will take precedence for the token endpoint
  '/api/hume/api-key*', // Add the API key endpoint to public paths for debugging
  '/api/hume/debug-key*', // Add the debug endpoint
  '/api/hume/direct-key*', // Add the direct key endpoint with no authentication
  '/blog*',
  '/privacy*',
  '/terms*',
  '/about*',
  '/contact*',
  '/pricing*'
];

const isPublic = (path: string) => {
  return publicPaths.find((x) =>
    path.match(new RegExp(`^${x.replace('*', '.*')}$`))
  );
};

export default clerkMiddleware(async (auth, req: NextRequest) => {
  const path = req.nextUrl.pathname;

  // Check public paths first to ensure token endpoint remains accessible
  if (isPublic(path)) {
    return NextResponse.next();
  }

  // For protected routes, check authentication and subscription
  if (isProtectedRoute(req)) {
    const session = await auth();
    
    // If not authenticated, redirect to sign-in
    if (!session) {
      // Use FRONTEND_URL for production or fallback to request origin
      const baseUrl = process.env.FRONTEND_URL || req.nextUrl.origin;
      const signInUrl = new URL('/sign-in', baseUrl);
      signInUrl.searchParams.set('redirect_url', req.nextUrl.href); // Use full URL for redirect
      return NextResponse.redirect(signInUrl.href);
    }

    try {
      // Get Convex token for subscription check
      const token = await session.getToken({ template: "convex" });
      
      // Check subscription status
      const { hasActiveSubscription } = await fetchQuery(api.subscriptions.getUserSubscriptionStatus, {}, {
        token: token!,
      });

      // For dashboard and other premium features, check subscription
      const requiresSubscription = false;
      
      if (requiresSubscription && !hasActiveSubscription) {
        // Use FRONTEND_URL for production or fallback to request origin
        const baseUrl = process.env.FRONTEND_URL || req.nextUrl.origin;
        const pricingUrl = new URL('/pricing', baseUrl);
        return NextResponse.redirect(pricingUrl.href);
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
      // On error, fail safe by allowing access
      // You might want to change this behavior based on your security requirements
      return NextResponse.next();
    }
  }

  return NextResponse.next();
});

// Export the config with improved matcher
export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next/static|_next/image|favicon.ico).*)',
    // Always run for API routes
    '/api/(.*)',
  ],
};