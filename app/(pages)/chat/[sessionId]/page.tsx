import { getHumeAccessToken } from "@/lib/hume";
import { ChatHistory } from "@/components/hume/chat-history";
import { ChatView } from "@/components/hume/chat-view";
import { Suspense } from "react";

interface ChatPageProps {
  params: Promise<{
    sessionId: string;
  }>;
}

export const dynamic = 'force-dynamic';

export default async function ChatPage({ params }: ChatPageProps) {
  const { sessionId } = await params;
  const accessToken = await getHumeAccessToken();

  if (!accessToken) {
    throw new Error("Failed to get Hume access token");
  }

  return (
    <div className="flex h-screen">
      <ChatHistory />
      <Suspense fallback={
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          Loading conversation...
        </div>
      }>
        <ChatView sessionId={sessionId} />
      </Suspense>
    </div>
  );
} 