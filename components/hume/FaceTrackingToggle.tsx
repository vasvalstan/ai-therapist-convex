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
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFaceTracking}
            className={`rounded-full ${className}`}
          >
            {isFaceTrackingEnabled ? (
              <VideoOff className="h-5 w-5" />
            ) : (
              <Video className="h-5 w-5" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {isFaceTrackingEnabled ? "Disable face tracking" : "Enable face tracking"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
