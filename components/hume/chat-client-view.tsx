'use client';

import { useEffect, useState } from "react";
import { ChatView } from "./chat-view";
import { ChatNav } from "./chat-nav";
import { ChatHistory } from "./chat-history";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Suspense } from "react";

interface ChatClientViewProps {
  sessionId: string;
}

export function ChatClientView({ sessionId }: ChatClientViewProps) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  
  // Check if conversation exists using Convex query
  const conversation = useQuery(api.chat.getActiveConversation, { chatId: sessionId });
  
  // Fetch access token on component mount
  useEffect(() => {
    async function fetchAccessToken() {
      try {
        setIsLoading(true);
        const response = await fetch("/api/hume/token");
        const data = await response.json();

        if (data.error) {
          setError(data.error);
          return;
        }

        setAccessToken(data.accessToken);
      } catch (err) {
        console.error("Error fetching Hume token:", err);
        setError("Failed to get access token. Please try refreshing the page.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchAccessToken();
  }, []);

  // Handle conversation not found
  useEffect(() => {
    if (conversation === null) {
      console.error("Chat not found:", sessionId);
      setError("Chat conversation not found. It may have been deleted or you don't have access to it.");
      
      // Redirect after a short delay to allow the error to be seen
      const timeout = setTimeout(() => {
        router.push('/chat/history');
      }, 3000);
      
      return () => clearTimeout(timeout);
    }
  }, [conversation, sessionId, router]);

  // Loading state
  if (isLoading || conversation === undefined) {
    return (
      <div className="flex h-screen flex-col">
        <div className="flex flex-1 overflow-hidden">
          <Suspense fallback={<div className="w-64 h-full border-r border-border" />}>
            <ChatHistory />
          </Suspense>
          <div className="flex-1 flex flex-col items-center justify-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-muted-foreground">Loading conversation...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !accessToken || conversation === null) {
    return (
      <div className="flex h-screen flex-col">
        <div className="flex flex-1 overflow-hidden">
          <Suspense fallback={<div className="w-64 h-full border-r border-border" />}>
            <ChatHistory />
          </Suspense>
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center space-y-4 max-w-lg">
              <h2 className="text-xl font-medium">Error</h2>
              <p className="text-muted-foreground">
                {error || conversation === null 
                  ? "Conversation not found. Redirecting to chat history..." 
                  : "Failed to get access token"}
              </p>
              <button 
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <ChatView sessionId={conversation?.chatId || sessionId} accessToken={accessToken} />;
} 