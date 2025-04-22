import { NextResponse } from 'next/server';

// This endpoint provides the Hume API key without authentication
// It should only be used in production when other methods fail
export async function GET() {
  try {
    // Get the API key from environment variables
    const humeApiKey = process.env.HUME_API_KEY;

    if (!humeApiKey) {
      console.error('HUME_API_KEY not found in environment variables');
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }

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
