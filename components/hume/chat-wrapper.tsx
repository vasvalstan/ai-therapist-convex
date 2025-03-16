"use client";

import dynamic from "next/dynamic";
import { useParams } from "next/navigation";

// Use dynamic import with SSR disabled to ensure client-side only rendering
const HumeChat = dynamic(() => import("@/components/hume/chat"), {
  ssr: false,
});

interface ChatWrapperProps {
  accessToken: string;
}

export function ChatWrapper({ accessToken }: ChatWrapperProps) {
  // Safely access params with error handling
  let sessionId: string | undefined;
  try {
    const params = useParams();
    sessionId = params?.sessionId as string | undefined;
  } catch (error) {
    console.error("Error accessing route params:", error);
    // Continue without sessionId, the chat component will handle this case
  }

  return (
    <div className="flex-1 flex flex-col">
      <HumeChat accessToken={accessToken} sessionId={sessionId} />
    </div>
  );
} 