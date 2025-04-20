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
    const response = await fetch('/api/hume/api-key');
    
    if (!response.ok) {
      console.error('Failed to fetch Hume API key:', await response.text());
      return null;
    }
    
    const data = await response.json();
    return data.apiKey || null;
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
