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
    <div className="flex flex-col h-full relative">
      {isFaceTrackingEnabled && (
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border shadow-sm">
          <div className="p-4">
            <FaceWidgets apiKey={humeApiKey} compact={true} />
          </div>
        </div>
      )}
      <div className="flex-1 overflow-y-auto">
        <HumeChat
          accessToken={accessToken}
          sessionId={sessionId}
          onEndCallStart={onEndCallStart}
        />
      </div>
    </div>
  );
}
