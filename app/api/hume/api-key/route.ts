import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';

export async function GET() {
  try {
    // Check authentication
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
