import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function GET() {
  try {
    // Check authentication
    const session = await auth();
    const userId = session.userId;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the Hume Voice configuration
    const humeApiKey = process.env.HUME_API_KEY;
    const humeConfigId = process.env.NEXT_PUBLIC_HUME_CONFIG_ID;

    if (!humeApiKey) {
      console.error('HUME_API_KEY not found in environment variables');
      return NextResponse.json(
        { error: 'Voice service not configured' },
        { status: 500 }
      );
    }

    // Return the configuration needed by the client
    // Note: We're not returning the actual API key, just the config ID
    // and any other non-sensitive information needed by the client
    return NextResponse.json({ 
      configId: humeConfigId,
      // Include a temporary token if needed by your voice service
      // This would be generated server-side
    });
  } catch (error) {
    console.error('Error retrieving voice service configuration:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve voice configuration' },
      { status: 500 }
    );
  }
}
