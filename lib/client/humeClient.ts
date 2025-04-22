/**
 * Client-side utilities for interacting with Hume AI
 * This file should NOT import server-only modules
 */

/**
 * Fetches the Hume API key from the server
 * @returns The Hume API key or null if there was an error
 */
export async function fetchHumeApiKey(): Promise<string | null> {
  try {
    // First try to get from localStorage if available (for development and testing)
    if (typeof window !== 'undefined') {
      const cachedKey = localStorage.getItem('hume_api_key');
      if (cachedKey) {
        console.log('Using cached Hume API key from localStorage');
        return cachedKey;
      }
    }
    
    // Otherwise fetch from server
    console.log('Fetching Hume API key from server...');
    let response;
    let errorText = '';
    
    // First try the regular endpoint that uses authentication
    try {
      response = await fetch('/api/hume/api-key');
      
      if (!response.ok) {
        errorText = await response.text();
        console.error(`Failed to fetch Hume API key from primary endpoint: ${response.status} ${response.statusText}`, errorText);
        // If authentication error, we'll try the direct endpoint
        throw new Error('Primary endpoint failed');
      }
    } catch (primaryError) {
      console.log('Trying fallback direct endpoint...');
      // Try the direct endpoint that doesn't use authentication
      try {
        response = await fetch('/api/hume/direct-key');
        
        if (!response.ok) {
          const directErrorText = await response.text();
          console.error(`Failed to fetch Hume API key from direct endpoint: ${response.status} ${response.statusText}`, directErrorText);
          
          // For development only - fallback to a default key if in development
          if (process.env.NODE_ENV === 'development') {
            console.warn('Using fallback API key for development');
            return process.env.NEXT_PUBLIC_HUME_API_KEY || null;
          }
          
          return null;
        }
      } catch (directError) {
        console.error('Error fetching from direct endpoint:', directError);
        return null;
      }
    }
    
    // Process the response from whichever endpoint succeeded
    const data = await response.json();
    
    if (data.apiKey) {
      // Cache in localStorage for future use
      if (typeof window !== 'undefined') {
        localStorage.setItem('hume_api_key', data.apiKey);
      }
      return data.apiKey;
    } else {
      console.error('No API key returned from server');
      return null;
    }
  } catch (error) {
    console.error('Error fetching Hume API key:', error);
    return null;
  }
}

/**
 * Fetches a Hume access token from the server
 * @returns The Hume access token or null if there was an error
 */
export async function fetchHumeAccessToken(): Promise<string | null> {
  try {
    const response = await fetch('/api/hume/token');
    
    if (!response.ok) {
      console.error('Failed to fetch Hume access token:', await response.text());
      return null;
    }
    
    const data = await response.json();
    return data.accessToken || null;
  } catch (error) {
    console.error('Error fetching Hume access token:', error);
    return null;
  }
}
