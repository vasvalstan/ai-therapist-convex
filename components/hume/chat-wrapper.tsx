"use client";

import dynamic from "next/dynamic";
import { useParams } from "next/navigation";

const HumeChat = dynamic(() => import("@/components/hume/chat"), {
  ssr: false,
});

interface ChatWrapperProps {
  accessToken: string;
}

export function ChatWrapper({ accessToken }: ChatWrapperProps) {
  const params = useParams();
  const sessionId = params?.sessionId as string | undefined;

  return (
    <div className="flex-1 flex flex-col">
      <HumeChat accessToken={accessToken} sessionId={sessionId} />
    </div>
  );
} 