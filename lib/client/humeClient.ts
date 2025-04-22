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
            errorDetails = await response.json();
          } catch (e) {
            try {
              errorDetails = await response.text();
            } catch (textError) {
              errorDetails = 'Could not parse response';
            }
          }
          
          console.error(`Failed to fetch from ${endpoint}: ${response.status} ${response.statusText}`, errorDetails);
          errors[endpoint] = {
            status: response.status,
            statusText: response.statusText,
            details: errorDetails
          };
          
          // In production, log more details about the error
          if (isProd) {
            console.error(`Production API key retrieval failed from ${endpoint}. Check Vercel environment variables.`);
          }
        }
      } catch (endpointError) {
        console.error(`Error fetching from ${endpoint}:`, endpointError);
        errors[endpoint] = endpointError;
      }
    }
    
    // If we get here, all endpoints failed
    console.error('All API key endpoints failed', errors);
    
    // Display a more user-friendly error message
    if (typeof window !== 'undefined') {
      const errorMessage = document.createElement('div');
      errorMessage.style.position = 'fixed';
      errorMessage.style.top = '10px';
      errorMessage.style.left = '50%';
      errorMessage.style.transform = 'translateX(-50%)';
      errorMessage.style.backgroundColor = '#f44336';
      errorMessage.style.color = 'white';
      errorMessage.style.padding = '15px';
      errorMessage.style.borderRadius = '5px';
      errorMessage.style.zIndex = '9999';
      errorMessage.style.maxWidth = '80%';
      errorMessage.style.textAlign = 'center';
      errorMessage.textContent = 'Unable to connect to face tracking service. Please try refreshing the page.';
      
      document.body.appendChild(errorMessage);
      
      // Remove the error message after 10 seconds
      setTimeout(() => {
        document.body.removeChild(errorMessage);
      }, 10000);
    }
    
    // Last resort: try to use a public key for demo purposes in development only
    if (isDevelopment && process.env.NEXT_PUBLIC_HUME_DEMO_KEY) {
      console.warn('Using public demo key as last resort (development only)');
      return process.env.NEXT_PUBLIC_HUME_DEMO_KEY;
    }
    
    return null;
  } catch (error) {
    console.error('Unexpected error in fetchHumeApiKey:', error);
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
