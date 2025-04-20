import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function GET(request: Request) {
  try {
    // Check authentication
    const session = await auth();
    const userId = session.userId;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the Hume API key from environment variables
    const humeApiKey = process.env.HUME_API_KEY;
    if (!humeApiKey) {
      console.error('HUME_API_KEY not found in environment variables');
      return NextResponse.json(
        { error: 'Voice service not configured' },
        { status: 500 }
      );
    }

    // Get query parameters
    const url = new URL(request.url);
    const chatId = url.searchParams.get('chat_id');
    const groupId = url.searchParams.get('group_id');

    if (!chatId || !groupId) {
      return NextResponse.json(
        { error: 'Missing required parameters: chat_id and group_id' },
        { status: 400 }
      );
    }

    // Make the request to Hume API
    const apiUrl = process.env.HUME_API_URL || 'https://api.hume.ai';
    const response = await fetch(
      `${apiUrl}/v1/chat-events?chat_id=${chatId}&group_id=${groupId}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${humeApiKey}`,
        },
      }
    );

    if (!response.ok) {
      console.error(`Failed to fetch events: ${response.status} ${response.statusText}`);
      try {
        const errorData = await response.json();
        console.error('Error details:', errorData);
      } catch (e) {
        console.error('Could not parse error response');
      }
      
      return NextResponse.json(
        { error: 'Failed to fetch chat events from voice service' },
        { status: response.status }
      );
    }

    // Return the events to the client
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching chat events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chat events' },
      { status: 500 }
    );
  }
}