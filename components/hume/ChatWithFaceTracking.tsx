"use client";

import { useState, useEffect } from "react";
import HumeChat from "./chat";
import { AudioVideoContainer } from "./AudioVideoContainer";

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
  // Simple API key for audio visualization (no longer need complex face tracking setup)
  const [apiKey] = useState("placeholder_api_key");
  
  return (
    <div className="flex flex-col w-full h-full relative">
      {/* Audio Visualizer at the top (always shown for voice chat) */}
      {!isHistoryView && (
        <div className="w-full flex justify-center pt-1 pb-1">
          <div className="w-full max-w-xs sm:max-w-sm">
            <AudioVideoContainer 
              apiKey={apiKey} 
              compact={true} 
            />
          </div>
        </div>
      )}
      
      {/* Minimal spacing between audio and chat messages */}
      <div className="w-full flex justify-center mb-2">
        <div className="w-full max-w-xs sm:max-w-sm text-center text-xs text-transparent select-none" aria-hidden="true">
          {sessionId ? "Earlier messages" : "Start your conversation"}
        </div>
      </div>
      
      {/* Chat interface below the audio visualizer */}
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
