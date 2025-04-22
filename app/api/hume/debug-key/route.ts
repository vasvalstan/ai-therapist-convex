import { NextResponse } from 'next/server';

// This endpoint is for debugging purposes only and should be removed in production
export async function GET() {
  try {
    // Get the API key from environment variables
    const humeApiKey = process.env.HUME_API_KEY;
    const humeConfigId = process.env.NEXT_PUBLIC_HUME_CONFIG_ID;
    
    // Return environment variable status (not the actual values)
    return NextResponse.json({
      status: {
        HUME_API_KEY: humeApiKey ? 'set' : 'not set',
        NEXT_PUBLIC_HUME_CONFIG_ID: humeConfigId ? 'set' : 'not set',
        NODE_ENV: process.env.NODE_ENV || 'not set'
      }
    });
  } catch (error) {
    console.error('Error in debug endpoint:', error);
    return NextResponse.json(
      { error: 'Debug endpoint error' },
      { status: 500 }
    );
  }
}
