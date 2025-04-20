/**
 * Client-side utilities for interacting with the voice service
 * This file does NOT contain any API keys
 */

/**
 * Fetches the voice service configuration from the server
 * @returns The voice service configuration or null if there was an error
 */
export async function fetchVoiceConfig() {
  try {
    const response = await fetch('/api/hume/voice-token');
    
    if (!response.ok) {
      console.error('Failed to fetch voice service configuration:', await response.text());
      return null;
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching voice service configuration:', error);
    return null;
  }
}

/**
 * Initializes the voice service with the configuration from the server
 * @param voiceService The voice service instance to initialize
 */
export async function initializeVoiceService(voiceService: any) {
  try {
    // Fetch configuration from our server-side API
    const config = await fetchVoiceConfig();
    
    if (!config) {
      console.error('Failed to initialize voice service: No configuration available');
      return false;
    }
    
    // Initialize the voice service with the configuration
    // This will vary depending on the specific voice service API
    if (voiceService && typeof voiceService.initialize === 'function') {
      await voiceService.initialize({
        configId: config.configId,
        // Any other configuration needed by the voice service
      });
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error initializing voice service:', error);
    return false;
  }
}