import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

// Simple in-memory rate limiting (consider using Redis or a similar solution in production)
const rateLimits = new Map<string, { count: number, resetTime: number }>();
const MAX_REQUESTS = 10; // Maximum requests per window
const WINDOW_MS = 60 * 1000; // 1 minute window

/**
 * API route to get the Hume access token
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
      console.error('Authentication required for access token in production');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    } else if (!userId && process.env.NODE_ENV !== 'production') {
      // Allow access in development mode without authentication
      console.warn('No user ID found in auth session, proceeding with access token retrieval in development mode');
    }
    
    // Get the API key and secret key from environment variables
    const humeApiKey = process.env.HUME_API_KEY;
    const humeSecretKey = process.env.HUME_SECRET_KEY;
    
    // Check if the API keys exist
    if (!humeApiKey || !humeSecretKey) {
      console.error('HUME_API_KEY or HUME_SECRET_KEY environment variable is not set');
      return NextResponse.json({ error: 'API keys not configured' }, { status: 500 });
    }
    
    try {
      // Generate a Hume access token
      const response = await fetch('https://api.hume.ai/v0/auth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: humeApiKey,
          client_secret: humeSecretKey,
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Failed to fetch Hume access token from Hume API: ${response.status} ${response.statusText}`, errorText);
        return NextResponse.json({ error: 'Failed to fetch access token from Hume API' }, { status: response.status });
      }
      
      const data = await response.json();
      
      // Log a masked version of the access token for debugging
      const accessToken = data.access_token;
      if (accessToken) {
        const maskedToken = accessToken.substring(0, 4) + '***';
        console.log(`Access token retrieved successfully (starts with: ${maskedToken})`);
      }
      
      return NextResponse.json({ accessToken: data.access_token });
    } catch (error) {
      console.error('Error fetching Hume access token from Hume API:', error);
      return NextResponse.json({ error: 'Error fetching access token' }, { status: 500 });
    }
  } catch (error) {
    // Log the error for debugging
    console.error('Error retrieving Hume access token:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
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
  
  // Get or create rate limit entry
  let rateLimit = rateLimits.get(identifier);
  if (!rateLimit) {
    rateLimit = { count: 0, resetTime: now + WINDOW_MS };
    rateLimits.set(identifier, rateLimit);
  }
  
  // Check if the rate limit window has expired
  if (now > rateLimit.resetTime) {
    // Reset the rate limit
    rateLimit.count = 0;
    rateLimit.resetTime = now + WINDOW_MS;
  }
  
  // Increment the request count
  rateLimit.count++;
  
  // Check if the rate limit has been exceeded
  return rateLimit.count > MAX_REQUESTS;
}
