import { NextResponse } from 'next/server';

// This endpoint is for debugging and fallback purposes with less strict authentication
// It should have basic protection but can be used when the primary endpoint fails
export async function GET(request: Request) {
  try {
    // Simple IP-based rate limiting (conceptual - would need persistent storage in production)
    const ip = request.headers.get('x-forwarded-for') || 'unknown-ip';
    
    // Get request details for logging and verification
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');
    const referer = request.headers.get('referer');
    
    // Log request details for debugging (without exposing sensitive data)
    console.log('Debug endpoint request details:', {
      ip,
      origin,
      host,
      referer: referer ? 'present' : 'missing',
      userAgent: request.headers.get('user-agent')?.substring(0, 50) + '...'
    });
    
    // Allow requests from our own domains and localhost
    const allowedDomains = [
      'localhost:3000',
      'sereni.day',
      'www.sereni.day',
      'ai-therapist-l5i9mm0tk-valentin-stancius-projects.vercel.app'
    ];
    
    // Check if the request is coming from an allowed domain
    // This is a basic check that can be bypassed, but provides some protection
    let isAllowedRequest = false;
    
    // Check origin header
    if (origin) {
      isAllowedRequest = allowedDomains.some(domain => origin.includes(domain));
    }
    
    // Check host header as fallback
    if (!isAllowedRequest && host) {
      isAllowedRequest = allowedDomains.some(domain => host.includes(domain));
    }
    
    // Check referer as another fallback
    if (!isAllowedRequest && referer) {
      isAllowedRequest = allowedDomains.some(domain => referer.includes(domain));
    }
    
    // In development mode, be more lenient
    if (process.env.NODE_ENV !== 'development' && !isAllowedRequest) {
      console.warn(`Blocked debug-key access from unauthorized source: ${origin || host || 'unknown'}`);
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }
    
    // Get the API key from environment variables
    const humeApiKey = process.env.HUME_API_KEY;
    
    if (!humeApiKey) {
      console.error('HUME_API_KEY environment variable is not set');
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }
    
    // Log a masked version of the API key for debugging
    const maskedKey = humeApiKey.substring(0, 4) + '***';
    console.log(`Debug endpoint: API key retrieved (starts with: ${maskedKey})`);
    
    // Return the API key
    return NextResponse.json({ apiKey: humeApiKey });
  } catch (error) {
    console.error('Error in debug endpoint:', error);
    return NextResponse.json(
      { error: 'Debug endpoint error' },
      { status: 500 }
    );
  }
}
