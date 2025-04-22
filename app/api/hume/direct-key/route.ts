import { NextResponse } from 'next/server';

// This endpoint has been secured to prevent unauthorized access to API keys
export async function GET(request: Request) {
  try {
    // Check for a valid authorization header or token
    const url = new URL(request.url);
    const authToken = url.searchParams.get('auth_token');
    const expectedToken = process.env.INTERNAL_API_AUTH_TOKEN;
    
    // Verify the request is coming from an allowed origin
    const origin = request.headers.get('origin');
    const allowedOrigins = [
      'http://localhost:3000',
      'https://sereni.day',
      // Add other allowed origins as needed
    ];
    
    const isValidOrigin = !origin || allowedOrigins.includes(origin);
    
    // In development mode, be more lenient with authentication
    if (process.env.NODE_ENV === 'development') {
      // In development, only check origin
      if (!isValidOrigin) {
        console.warn('Development mode: Invalid origin for direct-key endpoint');
        return NextResponse.json(
          { error: 'Invalid origin' },
          { status: 403 }
        );
      }
    } else {
      // In production, require both valid token and origin
      if ((!authToken || authToken !== expectedToken) || !isValidOrigin) {
        console.error('Unauthorized access attempt to direct-key endpoint');
        return NextResponse.json(
          { error: 'Unauthorized access' },
          { status: 401 }
        );
      }
    }

    // Get the API key from environment variables
    const humeApiKey = process.env.HUME_API_KEY;

    if (!humeApiKey) {
      console.error('HUME_API_KEY not found in environment variables');
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }

    // Log a masked version of the API key for debugging (only first 4 chars)
    const maskedKey = humeApiKey.substring(0, 4) + '***';
    console.log(`Direct API key endpoint: Key retrieved successfully (starts with: ${maskedKey})`);

    // Return the API key
    return NextResponse.json({ apiKey: humeApiKey });
  } catch (error) {
    console.error('Error retrieving Hume API key:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve API key' },
      { status: 500 }
    );
  }
}
