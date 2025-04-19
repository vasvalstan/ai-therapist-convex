"use client";

import { Button } from "@/components/ui/button";
import { Video, VideoOff } from "lucide-react";
import { useHume } from "./HumeProvider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface FaceTrackingToggleProps {
  className?: string;
}

export function FaceTrackingToggle({ className = "" }: FaceTrackingToggleProps) {
  const { isFaceTrackingEnabled, toggleFaceTracking } = useHume();

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFaceTracking}
            className={`rounded-full h-8 w-8 p-0 flex items-center justify-center ${className}`}
          >
            {isFaceTrackingEnabled ? (
              <VideoOff className="h-3.5 w-3.5" />
            ) : (
              <Video className="h-3.5 w-3.5" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {isFaceTrackingEnabled ? "Disable face tracking" : "Enable face tracking"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
