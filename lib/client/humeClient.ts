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
          console.log('Cached token expired, will fetch a new one');
        }
      }
    }
    
    // Otherwise fetch from server
    console.log('Fetching Hume API key from server...');
    
    // Check if we're in development mode
    const isDevelopment = process.env.NODE_ENV === 'development';
    const isProd = process.env.NODE_ENV === 'production';
    
    // Define all possible endpoints to try in order
    const endpoints = isProd 
      ? [
          '/api/hume/api-key',      // Primary authenticated endpoint
          '/api/hume/debug-key',     // Fallback endpoint with less strict auth
          '/api/hume/direct-key'    // Development-only direct endpoint (try last in prod)
        ]
      : [
          '/api/hume/direct-key',   // In dev, try direct endpoint first
          '/api/hume/api-key',      // Then try authenticated endpoint
          '/api/hume/debug-key'     // Then fallback
        ];
    
    // Track errors for diagnostic purposes
    const errors: Record<string, any> = {};
    
    // Try each endpoint in sequence until one works
    for (const endpoint of endpoints) {
      try {
        console.log(`Trying to fetch API key from ${endpoint}...`);
        
        // Add a timestamp to prevent caching
        const url = new URL(endpoint, window.location.origin);
        url.searchParams.append('_t', Date.now().toString());
        
        const response = await fetch(url.toString(), {
          // Add credentials to ensure cookies are sent
          credentials: 'same-origin',
          headers: {
            // Add a custom header to help identify the request
            'X-Request-Source': 'humeClient'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.apiKey) {
            console.log(`Successfully retrieved API key from ${endpoint}`);
            
            // Store in sessionStorage with expiration (30 minutes)
            if (typeof window !== 'undefined') {
              const expiresAt = new Date();
              expiresAt.setMinutes(expiresAt.getMinutes() + 30);
              
              const tokenData = {
                token: data.apiKey,
                expiresAt: expiresAt.toISOString(),
                source: endpoint
              };
              
              sessionStorage.setItem('hume_api_token', JSON.stringify(tokenData));
              
              // Log a masked version of the API key for debugging
              const maskedKey = data.apiKey.substring(0, 4) + '***';
              console.log(`API key retrieved successfully (starts with: ${maskedKey})`);
            }
            
            return data.apiKey;
          } else {
            console.warn(`${endpoint} returned a response but no API key was found`);
            errors[endpoint] = 'No API key in response';
          }
        } else {
          // Log detailed error information
          let errorDetails;
          try {
            errorDetails = await response.text();
          } catch (e) {
            errorDetails = 'Could not read error response';
          }
          
          console.warn(`${endpoint} returned status ${response.status}: ${errorDetails}`);
          errors[endpoint] = `Status ${response.status}: ${errorDetails}`;
        }
      } catch (error) {
        console.error(`Error fetching from ${endpoint}:`, error);
        errors[endpoint] = error instanceof Error ? error.message : String(error);
      }
    }
    
    // If we get here, all endpoints failed
    console.error('All API key endpoints failed:', errors);
    
    // Return null instead of throwing an error to prevent crashes during cleanup
    return null;
  } catch (error) {
    // Log the error but don't throw it during cleanup
    console.error('Error retrieving Hume API key:', error);
    return null;
  }
}

/**
 * Fetches a Hume access token from the server
 * @returns The Hume access token or null if there was an error
 */
export async function fetchHumeAccessToken(): Promise<string | null> {
  try {
    const response = await fetch('/api/hume/access-token');
    
    if (!response.ok) {
      console.error(`Failed to fetch Hume access token: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const data = await response.json();
    return data.accessToken || null;
  } catch (error) {
    console.error('Error fetching Hume access token:', error);
    return null;
  }
}
