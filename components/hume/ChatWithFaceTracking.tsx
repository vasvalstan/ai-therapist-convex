"use client";

import { useState, useEffect } from "react";
import HumeChat from "./chat";
import { FaceWidgets } from "./FaceWidgets";
import { EmotionAwareChat } from "./EmotionAwareChat";
import { useHume } from "./HumeProvider";

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
  const { isFaceTrackingEnabled } = useHume(); // Get face tracking state from the HumeProvider
  const [humeApiKey, setHumeApiKey] = useState<string>("");
  
  // Fetch the Hume API key when the component mounts
  useEffect(() => {
    if (isHistoryView) return;
    
    const fetchHumeApiKey = async () => {
      try {
        // Try to get the API key from localStorage first (if previously saved)
        const savedKey = localStorage.getItem('hume_api_key');
        if (savedKey) {
          setHumeApiKey(savedKey);
          return;
        }
        
        // Otherwise fetch it from the server
        const response = await fetch('/api/hume/api-key');
        const data = await response.json();
        
        if (data.apiKey) {
          setHumeApiKey(data.apiKey);
          // Save for future use
          localStorage.setItem('hume_api_key', data.apiKey);
        } else {
          console.error("No API key returned from server");
        }
      } catch (error) {
        console.error("Error fetching Hume API key:", error);
        
        // Fallback to hardcoded key if in development (not recommended for production)
        if (process.env.NODE_ENV === 'development') {
          const fallbackKey = "znC5lwg0niYf3NvHd0zWzNBkA3cNK8YYiAaAcxM80AL9A2G1";
          setHumeApiKey(fallbackKey);
          localStorage.setItem('hume_api_key', fallbackKey);
        }
      }
    };
    
    fetchHumeApiKey();
  }, [isHistoryView]);
  
  return (
    <div className="flex flex-col w-full h-full relative">
      {/* Video feed at the top when enabled */}
      {!isHistoryView && isFaceTrackingEnabled && humeApiKey && (
        <div className="w-full border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-2">
          <div className="flex justify-center">
            <FaceWidgets 
              apiKey={humeApiKey} 
              compact={true} 
            />
          </div>
        </div>
      )}
      
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
      
      {/* Emotion awareness component */}
      {!isHistoryView && isFaceTrackingEnabled && sessionId && humeApiKey && (
        <EmotionAwareChat 
          sessionId={sessionId} 
          isActive={isFaceTrackingEnabled} 
        />
      )}
    </div>
  );
}
