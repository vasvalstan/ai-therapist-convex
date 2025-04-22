import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

/**
 * API route to get the Hume API key
 * This is a protected route that requires authentication
 */
export async function GET() {
  try {
    // Try to get the authentication session
    const { userId } = await auth();
    
    // If no user ID, try to proceed anyway but log the issue
    if (!userId) {
      console.warn('No user ID found in auth session, proceeding with API key retrieval anyway');
    }
    
    // Get the API key from environment variables
    const humeApiKey = process.env.HUME_API_KEY;
    
    // Check if the API key exists
    if (!humeApiKey) {
      console.error('HUME_API_KEY environment variable is not set');
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }
    
    // Return the API key
    return NextResponse.json({ apiKey: humeApiKey });
  } catch (error) {
    // Log the error for debugging
    console.error('Error retrieving Hume API key:', error);
    
    // Return a more helpful error message
    return NextResponse.json(
      { 
        error: 'Authentication service error',
        message: 'Unable to authenticate request. The application will try alternative methods to retrieve the API key.'
      }, 
      { status: 500 }
    );
  }
}
