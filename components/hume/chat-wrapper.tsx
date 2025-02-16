"use client";

import dynamic from "next/dynamic";

const HumeChat = dynamic(() => import("@/components/hume/chat"), {
  ssr: false,
});

interface ChatWrapperProps {
  accessToken: string;
}

export function ChatWrapper({ accessToken }: ChatWrapperProps) {
  return (
    <div className="flex-1 flex flex-col">
      <HumeChat accessToken={accessToken} />
    </div>
  );
} 