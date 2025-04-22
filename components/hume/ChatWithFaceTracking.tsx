"use client";

import { useState, useEffect } from "react";
import HumeChat from "./chat";
import { EmotionAwareChat } from "./EmotionAwareChat";
import { useHume } from "./HumeProvider";
import { AudioVideoContainer } from "./AudioVideoContainer";
import { fetchHumeApiKey } from "@/lib/client/humeClient";

interface ChatWithFaceTrackingProps {
  accessToken: string;
  sessionId?: string;
  onEndCallStart?: () => void;
  isHistoryView?: boolean;
}

export function ChatWithFaceTracking({ 
  accessToken, 
  sessionId, 
  onEndCallStart,
  isHistoryView = false
}: ChatWithFaceTrackingProps) {
  const { isFaceTrackingEnabled, humeApiKey, setHumeApiKey } = useHume(); // Get face tracking state and API key from the HumeProvider
  
  // Fetch the Hume API key when the component mounts
  useEffect(() => {
    if (isHistoryView) return;
    
    const getHumeApiKey = async () => {
      try {
        // Fetch the API key from the server using our client-safe utility
        // This now uses sessionStorage with token expiration instead of localStorage
        const apiKey = await fetchHumeApiKey();
        
        if (apiKey) {
          console.log("Successfully retrieved Hume API key");
          setHumeApiKey(apiKey);
        } else {
          console.error("No API key returned from server");
          // Show an error message to the user
          alert("Failed to retrieve API key for face tracking. Please refresh and try again.");
        }
      } catch (error) {
        console.error("Error fetching Hume API key:", error);
      }
    };
    
    getHumeApiKey();
    
    // Add event listener for refreshing the API key
    const handleRefreshApiKey = () => {
      console.log("Received request to refresh API key");
      // Clear any cached token
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('hume_api_token');
      }
      getHumeApiKey();
    };
    
    window.addEventListener('hume-refresh-api-key', handleRefreshApiKey);
    
    // Clean up event listener on unmount
    return () => {
      window.removeEventListener('hume-refresh-api-key', handleRefreshApiKey);
    };
  }, [isHistoryView]);
  
  return (
    <div className="flex flex-col w-full h-full relative">
      {/* Video feed or Audio Visualizer at the top */}
      {!isHistoryView && humeApiKey && (
        <div className="w-full flex justify-center pt-2">
          <div className="w-full max-w-md">
            <AudioVideoContainer 
              apiKey={humeApiKey} 
              compact={true} 
            />
          </div>
        </div>
      )}
      
      {/* Emotion awareness component */}
      {!isHistoryView && isFaceTrackingEnabled && sessionId && humeApiKey && (
        <div className="w-full flex justify-center mt-3 mb-4">
          <div className="w-full max-w-md">
            <EmotionAwareChat 
              sessionId={sessionId} 
              isActive={isFaceTrackingEnabled} 
            />
          </div>
        </div>
      )}
      
      {/* Delimiter between video/emotions and chat messages - invisible but kept for spacing */}
      <div className="w-full flex justify-center mb-4">
        <div className="w-full max-w-md text-center text-sm text-transparent select-none" aria-hidden="true">
          {sessionId ? "Earlier messages" : "Start your conversation"}
        </div>
      </div>
      
      {/* Chat interface below the video */}
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto">
            <HumeChat 
              accessToken={accessToken} 
              sessionId={sessionId}
              onEndCallStart={onEndCallStart}
              hideStartCall={true} // Pass this prop to hide the StartCall component in HumeChat
            />
          </div>
        </div>
      </div>
    </div>
  );
}
