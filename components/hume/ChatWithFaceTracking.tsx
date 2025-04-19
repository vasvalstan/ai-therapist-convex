"use client";

import { useHume } from "./HumeProvider";
import HumeChat from "./chat";
import { FaceWidgets } from "./FaceWidgets";
import { FaceTrackingToggle } from "./FaceTrackingToggle";

interface ChatWithFaceTrackingProps {
  accessToken: string;
  sessionId?: string;
  onEndCallStart?: () => void;
}

export function ChatWithFaceTracking({
  accessToken,
  sessionId,
  onEndCallStart
}: ChatWithFaceTrackingProps) {
  const { isFaceTrackingEnabled, humeApiKey } = useHume();

  return (
    <div className="flex flex-col h-full">
      {/* Face tracking container - always visible when enabled */}
      {isFaceTrackingEnabled && (
        <div className="bg-background border-b border-border">
          <div className="p-2 max-h-[30vh]">
            <FaceWidgets apiKey={humeApiKey} compact={true} />
          </div>
        </div>
      )}
      
      {/* Chat container - takes remaining space */}
      <div className={`flex-1 flex flex-col ${isFaceTrackingEnabled ? 'h-[70vh]' : 'h-full'}`}>
        <HumeChat
          accessToken={accessToken}
          sessionId={sessionId}
          onEndCallStart={onEndCallStart}
        />
      </div>
    </div>
  );
}
