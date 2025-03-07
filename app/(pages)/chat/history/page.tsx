"use client";

export const dynamic = 'force-dynamic';

import { ChatHistory } from "@/components/hume/chat-history";
import { Suspense, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { UpgradePrompt } from "@/components/hume/upgrade-prompt";
import { StartConversationPanel } from "@/components/hume/start-conversation-panel";
import { VoiceProvider } from "@humeai/voice-react";
import { VoiceController } from "@/components/hume/voice-controller";

export default function ChatHistoryPage() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accessStatus, setAccessStatus] = useState<{
    hasAccess: boolean;
    reason?: string;
    limitType?: string;
  }>({ hasAccess: true });

  const { userId } = useAuth();
  
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
            sessionId={chatSessions && chatSessions.length > 0 ? chatSessions[0].sessionId : undefined} 
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
      
      {/* Wrap the StartConversationPanel in VoiceProvider */}
      <VoiceProvider
        auth={{ type: "accessToken", value: accessToken }}
        configId={process.env.NEXT_PUBLIC_HUME_CONFIG_ID}
        onMessage={(message) => {
          console.log("Message received:", message);
        }}
      >
        <VoiceController />
        <StartConversationPanel />
      </VoiceProvider>
    </div>
  );
} 