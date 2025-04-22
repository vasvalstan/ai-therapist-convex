import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

// Simple in-memory rate limiting (consider using Redis or a similar solution in production)
const rateLimits = new Map<string, { count: number, resetTime: number }>();
const MAX_REQUESTS = 10; // Maximum requests per window
const WINDOW_MS = 60 * 1000; // 1 minute window

/**
 * API route to get the Hume API key
 * This is a protected route that requires authentication
 */
export async function GET(request: Request) {
  try {
    // Get client IP for rate limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown-ip';
    
    // Check rate limit
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }
    
    // Try to get the authentication session
    const { userId } = await auth();
    
    // If no user ID, reject the request in production
    if (!userId && process.env.NODE_ENV === 'production') {
      console.error('Authentication required for API key access in production');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    } else if (!userId && process.env.NODE_ENV !== 'production') {
      // Allow access in development mode without authentication
      console.warn('No user ID found in auth session, proceeding with API key retrieval in development mode');
    }
    
    // Get the API key from environment variables
    const humeApiKey = process.env.HUME_API_KEY;
    
    // Check if the API key exists
    if (!humeApiKey) {
      console.error('HUME_API_KEY environment variable is not set');
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }
    
    // Log a masked version of the API key for debugging (only first 4 chars)
    const maskedKey = humeApiKey.substring(0, 4) + '***';
    console.log(`API key retrieved successfully (starts with: ${maskedKey})`);
    
    // Return the API key
    return NextResponse.json({ apiKey: humeApiKey });
  } catch (error) {
    // Log the error for debugging
    console.error('Error retrieving Hume API key:', error);
    
    // Return a more helpful error message
    return NextResponse.json(
      { 
        error: 'Authentication service error',
        message: 'Unable to authenticate request. Please try again later.'
      }, 
      { status: 500 }
    );
  }
}

/**
 * Check if the client is rate limited
 * @param identifier The client identifier (IP address)
 * @returns true if rate limited, false otherwise
 */
function isRateLimited(identifier: string): boolean {
  const now = Date.now();
  
  // Get or initialize rate limit data for this client
  let limitData = rateLimits.get(identifier);
  if (!limitData || now > limitData.resetTime) {
    // Reset if window has expired
    limitData = { count: 0, resetTime: now + WINDOW_MS };
    rateLimits.set(identifier, limitData);
  }
  
  // Increment request count
  limitData.count++;
  
  // Check if over limit
  if (limitData.count > MAX_REQUESTS) {
    return true;
  }
  
  return false;
}
