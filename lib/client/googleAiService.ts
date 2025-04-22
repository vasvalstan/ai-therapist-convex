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
    const response = await fetch('/api/google-ai/api-key');
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Failed to retrieve Google AI API key:', errorData);
      throw new Error(`Failed to retrieve API key: ${errorData.error || response.statusText}`);
    }
    
    const data = await response.json();
    return data.apiKey;
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
