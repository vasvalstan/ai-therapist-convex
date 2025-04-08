'use client';

import { ChatClientView } from "@/components/hume/chat-client-view";
import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";

export default function ChatPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const rawSessionId = params?.sessionId;
  if (!rawSessionId) {
    router.push('/chat/history');
    return null;
  }
  
  const sessionId = Array.isArray(rawSessionId) ? rawSessionId[0] : rawSessionId;
  const tab = searchParams?.get('tab');
  
  // Handle redirection to chat tab if no tab is specified
  useEffect(() => {
    if (!tab && !isRedirecting) {
      setIsRedirecting(true);
      router.push(`/chat/${sessionId}?tab=chat`);
    } else {
      setIsLoading(false);
    }
  }, [tab, sessionId, router, isRedirecting]);
  
  if (isLoading || isRedirecting) {
    return (
      <div className="flex h-screen flex-col">
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          Loading conversation...
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex h-screen flex-col">
      <Suspense fallback={
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          Loading conversation...
        </div>
      }>
        <ChatClientView sessionId={sessionId} />
      </Suspense>
    </div>
  );
} 