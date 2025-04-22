/**
 * Client-side utility for working with Google AI services
 * Handles secure API key retrieval and common operations
 */

/**
 * Fetches the Google AI API key from the server
 * This ensures the API key is never exposed in the client
 */
export async function getGoogleAiApiKey(): Promise<string> {
  try {
    // First try to get from sessionStorage if available
    if (typeof window !== 'undefined') {
      const cachedToken = sessionStorage.getItem('google_ai_token');
      if (cachedToken) {
        const tokenData = JSON.parse(cachedToken);
        // Check if token is still valid (not expired)
        if (tokenData.expiresAt && new Date(tokenData.expiresAt) > new Date()) {
          console.log('Using cached Google AI token from sessionStorage');
          return tokenData.token;
        } else {
          // Token expired, remove it
          sessionStorage.removeItem('google_ai_token');
        }
      }
    }

    const response = await fetch('/api/google-ai/api-key');
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Failed to retrieve Google AI API key:', errorData);
      throw new Error(`Failed to retrieve API key: ${errorData.error || response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.apiKey) {
      // Store in sessionStorage with expiration
      if (typeof window !== 'undefined' && data.expiresAt) {
        const tokenData = {
          token: data.apiKey,
          expiresAt: data.expiresAt
        };
        
        sessionStorage.setItem('google_ai_token', JSON.stringify(tokenData));
      }
      
      return data.apiKey;
    } else {
      throw new Error('No API key returned from server');
    }
  } catch (error) {
    console.error('Error retrieving Google AI API key:', error);
    throw new Error('Unable to retrieve Google AI API key. Please try again later.');
  }
}

/**
 * Initializes a Google AI client with the API key
 * This should only be used server-side (in API routes or server components)
 */
export async function initializeGoogleAiClient() {
  try {
    const apiKey = await getGoogleAiApiKey();
    
    // Dynamically import the Google AI SDK to reduce client bundle size
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    
    // Initialize and return the client
    return new GoogleGenerativeAI(apiKey);
  } catch (error) {
    console.error('Error initializing Google AI client:', error);
    throw new Error('Failed to initialize Google AI client');
  }
}
