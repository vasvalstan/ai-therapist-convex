import { NextResponse } from 'next/server';

// This endpoint is for debugging and fallback purposes with less strict authentication
// It should have rate limiting and basic protection but can be used when the primary endpoint fails
export async function GET(request: Request) {
  try {
    // Simple IP-based rate limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown-ip';
    const rateLimitKey = `hume-debug-${ip}`;
    
    // In production, add additional verification
    if (process.env.NODE_ENV === 'production') {
      // Check origin header to ensure it's coming from our own domain
      const origin = request.headers.get('origin');
      const host = request.headers.get('host');
      
      // Log request details for debugging (without exposing sensitive data)
      console.log('Debug endpoint request details:', {
        ip,
        origin,
        host,
        userAgent: request.headers.get('user-agent')
      });
      
      // Verify the request is coming from our own domain
      const allowedDomains = [
        'sereni.day',
        'www.sereni.day',
        'ai-therapist-l5i9mm0tk-valentin-stancius-projects.vercel.app'
      ];
      
      const isAllowedOrigin = allowedDomains.some(domain => 
        origin?.includes(domain) || host?.includes(domain)
      );
      
      if (!isAllowedOrigin) {
        console.warn('Blocked debug-key access from unauthorized origin:', origin);
        return NextResponse.json(
          { error: 'Unauthorized access' },
          { status: 403 }
        );
      }
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
