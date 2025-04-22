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
    // First try to get from sessionStorage if available (temporary, session-only storage)
    if (typeof window !== 'undefined') {
      const cachedToken = sessionStorage.getItem('hume_api_token');
      if (cachedToken) {
        const tokenData = JSON.parse(cachedToken);
        // Check if token is still valid (not expired)
        if (tokenData.expiresAt && new Date(tokenData.expiresAt) > new Date()) {
          console.log('Using cached Hume API token from sessionStorage');
          return tokenData.token;
        } else {
          // Token expired, remove it
          sessionStorage.removeItem('hume_api_token');
        }
      }
    }
    
    // Otherwise fetch from server
    console.log('Fetching Hume API key from server...');
    let response;
    
    // Check if we're in development mode
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    // In development mode, try the direct endpoint first to avoid auth issues
    if (isDevelopment) {
      try {
        console.log('Development mode: trying direct endpoint first...');
        response = await fetch('/api/hume/direct-key');
        
        if (response.ok) {
          console.log('Successfully retrieved API key from direct endpoint');
          const data = await response.json();
          
          if (data.apiKey) {
            // Store in sessionStorage with expiration (30 minutes)
            if (typeof window !== 'undefined') {
              const expiresAt = new Date();
              expiresAt.setMinutes(expiresAt.getMinutes() + 30);
              
              const tokenData = {
                token: data.apiKey,
                expiresAt: expiresAt.toISOString()
              };
              
              sessionStorage.setItem('hume_api_token', JSON.stringify(tokenData));
            }
            return data.apiKey;
          }
        } else {
          console.warn(`Direct endpoint failed: ${response.status} ${response.statusText}`);
        }
      } catch (directError) {
        console.error('Error fetching from direct endpoint:', directError);
      }
    }
    
    // If direct endpoint failed or we're in production, try the authenticated endpoint
    try {
      console.log('Trying authenticated endpoint...');
      response = await fetch('/api/hume/api-key');
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Failed to fetch Hume API key from primary endpoint: ${response.status} ${response.statusText}`, errorText);
        throw new Error('Primary endpoint failed');
      }
      
      const data = await response.json();
      
      if (data.apiKey) {
        // Store in sessionStorage with expiration (30 minutes)
        if (typeof window !== 'undefined') {
          const expiresAt = new Date();
          expiresAt.setMinutes(expiresAt.getMinutes() + 30);
          
          const tokenData = {
            token: data.apiKey,
            expiresAt: expiresAt.toISOString()
          };
          
          sessionStorage.setItem('hume_api_token', JSON.stringify(tokenData));
        }
        return data.apiKey;
      } else {
        console.error('No API key returned from authenticated endpoint');
      }
    } catch (authError) {
      console.error('Error with authenticated endpoint:', authError);
      
      // If we haven't tried the direct endpoint yet (in production), try it now as fallback
      if (!isDevelopment) {
        try {
          console.log('Trying fallback direct endpoint...');
          const internalAuthToken = localStorage.getItem('internal_auth_token') || '';
          response = await fetch(`/api/hume/direct-key?auth_token=${internalAuthToken}`);
          
          if (!response.ok) {
            const directErrorText = await response.text();
            console.error(`Failed to fetch Hume API key from direct endpoint: ${response.status} ${response.statusText}`, directErrorText);
            return null;
          }
          
          const data = await response.json();
          
          if (data.apiKey) {
            // Store in sessionStorage with expiration (30 minutes)
            if (typeof window !== 'undefined') {
              const expiresAt = new Date();
              expiresAt.setMinutes(expiresAt.getMinutes() + 30);
              
              const tokenData = {
                token: data.apiKey,
                expiresAt: expiresAt.toISOString()
              };
              
              sessionStorage.setItem('hume_api_token', JSON.stringify(tokenData));
            }
            return data.apiKey;
          }
        } catch (directError) {
          console.error('Error fetching from direct endpoint:', directError);
        }
      }
    }
    
    // If we get here, both endpoints failed
    console.error('All API key retrieval methods failed');
    return null;
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
