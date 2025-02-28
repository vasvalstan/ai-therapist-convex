export const dynamic = 'force-dynamic';

import { getHumeAccessToken } from "@/lib/hume";
import { ChatHistory } from "@/components/hume/chat-history";
import { Suspense } from "react";

export default async function ChatHistoryPage() {
  const accessToken = await getHumeAccessToken();

  if (!accessToken) {
    throw new Error("Failed to get Hume access token");
  }

  return (
    <div className="flex h-screen">
      <Suspense fallback={<div className="w-64 h-full border-r border-border" />}>
        <ChatHistory />
      </Suspense>
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        Select a conversation from the sidebar or start a new one
      </div>
    </div>
  );
} 