"use client";

import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { useState, useEffect } from "react";

// Use dynamic import with SSR disabled to ensure client-side only rendering
const HumeChat = dynamic(() => import("@/components/hume/chat"), {
  ssr: false,
});

interface ChatWrapperProps {
  accessToken: string;
}

export function ChatWrapper({ accessToken }: ChatWrapperProps) {
  // Always call hooks at the top level
  const params = useParams();
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [paramsError, setParamsError] = useState(false);
  
  // Handle params in an effect
  useEffect(() => {
    try {
      if (params && params.sessionId) {
        setSessionId(params.sessionId as string);
      }
    } catch (error) {
      console.error("Error accessing route params:", error);
      setParamsError(true);
    }
  }, [params]);

  return (
    <div className="flex-1 flex flex-col">
      {paramsError && (
        <div className="p-4 text-red-500">
          Error loading session parameters. Please try refreshing the page.
        </div>
      )}
      <HumeChat accessToken={accessToken} sessionId={sessionId} />
    </div>
  );
} 