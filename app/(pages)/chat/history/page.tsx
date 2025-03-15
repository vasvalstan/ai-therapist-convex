"use client";

export const dynamic = 'force-dynamic';

import { ChatHistory } from "@/components/hume/chat-history";
import { Suspense, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { UpgradePrompt } from "@/components/hume/upgrade-prompt";
import { StartConversationPanel } from "@/components/hume/start-conversation-panel";
import { VoiceController } from "@/components/hume/voice-controller";
import { TherapyProgress } from "@/components/hume/therapy-progress";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "@/components/ui/use-toast";
import { ChatNav } from "@/components/hume/chat-nav";
import type { ChatSession } from "@/lib/types";

export default function ChatHistoryPage() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accessStatus, setAccessStatus] = useState<{
    hasAccess: boolean;
    reason?: string;
    limitType?: string;
  }>({ hasAccess: true });
  const [isStarting, setIsStarting] = useState(false);

  const { userId } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Get the current user's plan status
  const user = useQuery(api.users.getUserByToken, 
    userId ? { tokenIdentifier: userId } : "skip"
  );
  
  // Get user's chat sessions to check limits
  const chatSessions = useQuery(
    api.chat.getChatSessions,
    userId ? {} : "skip"
  );
  
  // Get plan details
  const plans = useQuery(api.plans.getAllPlans);

  const handleStartChat = async (session: ChatSession) => {
    try {
      setIsStarting(true);
      
      // Get a new access token
      const response = await fetch("/api/hume/token");
      const { accessToken } = await response.json();
      setAccessToken(accessToken);
      
      // Navigate to the chat page
      router.push(`/chat/${session.chatId}`);
    } catch (error) {
      console.error("Error starting chat:", error);
      toast({
        title: "Error",
        description: "Failed to start chat. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsStarting(false);
    }
  };

  useEffect(() => {
    // Check if user has access based on plan limits
    if (user && plans && chatSessions) {
      const userPlan = plans.find(plan => plan.key === (user.currentPlanKey || "free"));
      
      if (!userPlan) {
        setAccessStatus({
          hasAccess: false,
          reason: "Unable to determine your plan. Please contact support.",
        });
        return;
      }
      
      // Check minutes remaining for paid plans only
      if (userPlan.key !== "free" && user.minutesRemaining !== undefined && user.minutesRemaining <= 0) {
        setAccessStatus({
          hasAccess: false,
          reason: "You have used all your available minutes. Please upgrade your plan to continue.",
          limitType: "minutes"
        });
        return;
      }
      
      // Free plan has unlimited sessions and time, so we skip the session limit check
      
      // User has access
      setAccessStatus({ hasAccess: true });
    }
  }, [user, plans, chatSessions]);
  
  useEffect(() => {
    // If user doesn't have access, don't fetch the token
    if (!accessStatus.hasAccess) {
      return;
    }
    
    const fetchToken = async () => {
      try {
        const response = await fetch("/api/hume/token");
        const data = await response.json();

        if (data.error) {
          setError(data.error);
          return;
        }

        setAccessToken(data.accessToken);
      } catch (err) {
        setError("Failed to get Hume access token");
        console.error("Error fetching Hume token:", err);
      }
    };

    if (user) {
      fetchToken();
    }
  }, [user, accessStatus.hasAccess]);

  // If user is loading, show a clean loading state
  if ((!user || !plans || !chatSessions) && !error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <div>Loading...</div>
        </div>
      </div>
    );
  }

  // If user doesn't have access, show upgrade prompt
  if (!accessStatus.hasAccess && accessStatus.reason) {
    return (
      <div className="flex h-screen">
        <Suspense fallback={<div className="w-64 h-full border-r border-border" />}>
          <ChatHistory />
        </Suspense>
        <div className="flex-1 flex items-center justify-center">
          <UpgradePrompt 
            reason={accessStatus.reason} 
            chatId={chatSessions && chatSessions.length > 0 ? chatSessions[0].chatId : undefined} 
          />
        </div>
      </div>
    );
  }

  // If there's another error, show error message
  if (error) {
    return (
      <div className="flex h-screen">
        <Suspense fallback={<div className="w-64 h-full border-r border-border" />}>
          <ChatHistory />
        </Suspense>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-red-500">Error: {error}</div>
        </div>
      </div>
    );
  }

  // If token is still loading, show loading state
  if (!accessToken) {
    return (
      <div className="flex h-screen">
        <Suspense fallback={<div className="w-64 h-full border-r border-border" />}>
          <ChatHistory />
        </Suspense>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <div>Preparing your chat...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <Suspense fallback={<div className="w-64 h-full border-r border-border" />}>
        <ChatHistory />
      </Suspense>
      
      <div className="flex-1 flex flex-col">
        <Tabs defaultValue={searchParams?.get("tab") || "start"} className="flex-1">
          <ChatNav />
          
          <TabsContent value="start" className="mt-0 h-[calc(100%-48px)]">
            <VoiceController />
            <StartConversationPanel />
          </TabsContent>
          
          <TabsContent value="progress" className="mt-0 h-[calc(100%-48px)] overflow-auto">
            <TherapyProgress />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 