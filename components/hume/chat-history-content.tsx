"use client";

import { ChatHistory } from "@/components/hume/chat-history";
import { Suspense, useEffect, useState } from "react";
import { useAuth as useClerkAuth } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { useQuery, Authenticated, useConvexAuth, useMutation } from "convex/react";
import { UpgradePrompt } from "@/components/hume/upgrade-prompt";
import { StartConversationPanel } from "@/components/hume/start-conversation-panel";
import { VoiceController } from "@/components/hume/voice-controller";
import { TherapyProgress } from "@/components/hume/therapy-progress";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "@/components/ui/use-toast";
import { ChatNav } from "@/components/hume/chat-nav";
import type { ChatSession } from "@/lib/types";

export function ChatHistoryContentWrapper() {
  const { isLoading, isAuthenticated } = useConvexAuth();

  // Show initial loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <div>Loading...</div>
        </div>
      </div>
    );
  }

  // Show authenticated content
  return (
    <Authenticated>
      <ChatHistoryContent />
    </Authenticated>
  );
}

export function ChatHistoryContent() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accessStatus, setAccessStatus] = useState<{
    hasAccess: boolean;
    reason?: string;
    limitType?: string;
  }>({ hasAccess: true });

  const { isAuthenticated } = useConvexAuth();
  const { userId } = useClerkAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Get the current user's plan status
  const user = useQuery(api.users.getUserByToken, 
    userId ? { tokenIdentifier: userId } : "skip"
  );

  // Store user if not found
  const [isStoringUser, setIsStoringUser] = useState(false);
  const storeUser = useMutation(api.users.store);
  
  useEffect(() => {
    if (!userId || isStoringUser || user !== null || !isAuthenticated) {
      return;
    }

    let isMounted = true;
    setIsStoringUser(true);

    // Call store mutation to create user
    const createUser = async () => {
      try {
        await storeUser();
        
        // Refresh the page to get the new user data
        if (isMounted) {
          router.refresh();
        }
      } catch (err) {
        console.error('Error storing user:', err);
        if (isMounted) {
          setError('Failed to initialize user data. Please try refreshing the page.');
        }
      } finally {
        if (isMounted) {
          setIsStoringUser(false);
        }
      }
    };

    createUser();

    return () => {
      isMounted = false;
    };
  }, [userId, user, isStoringUser, isAuthenticated, storeUser]);
  
  // Get user's chat sessions to check limits
  const chatSessions = useQuery(
    api.chat.getChatSessions,
    userId ? {} : "skip"
  );
  
  // Get plan details
  const plans = useQuery(api.plans.getAllPlans);

  // Track loading state for token fetch
  const [isTokenLoading, setIsTokenLoading] = useState(false);

  useEffect(() => {
    // Only check access status when we have all required data
    if (!user || !plans || !chatSessions) {
      return;
    }

    const userPlan = plans.find(plan => plan.key === (user.currentPlanKey || "free"));
    
    if (!userPlan) {
      setAccessStatus({
        hasAccess: false,
        reason: "Unable to determine your plan. Please contact support.",
      });
      return;
    }
    
    // Check minutes remaining for paid plans only
    if (userPlan.key !== "free" && 
        user.minutesRemaining !== undefined && 
        user.minutesRemaining <= 0) {
      setAccessStatus({
        hasAccess: false,
        reason: "You have used all your available minutes. Please upgrade your plan to continue.",
        limitType: "minutes"
      });
      return;
    }
    
    // Only update access status if it's different from current
    setAccessStatus(current => {
      if (!current.hasAccess || current.reason) {
        return { hasAccess: true };
      }
      return current;
    });
  }, [user, plans, chatSessions]);

  useEffect(() => {
    // If user doesn't have access or we're already fetching, don't fetch the token
    if (!accessStatus.hasAccess || !user || isTokenLoading) {
      return;
    }
    
    let isMounted = true;
    
    const fetchToken = async () => {
      try {
        setIsTokenLoading(true);
        const response = await fetch("/api/hume/token");
        const data = await response.json();

        if (!isMounted) return;

        if (data.error) {
          setError(data.error);
          return;
        }

        setAccessToken(data.accessToken);
      } catch (err) {
        if (!isMounted) return;
        setError("Failed to get Hume access token");
        console.error("Error fetching Hume token:", err);
      } finally {
        if (isMounted) {
          setIsTokenLoading(false);
        }
      }
    };

    fetchToken();
    
    return () => {
      isMounted = false;
    };
  }, [user, accessStatus.hasAccess]);

  // If user is not authenticated, show loading state
  if (!userId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <div>Loading...</div>
        </div>
      </div>
    );
  }

  // If storing user, show loading state
  if (isStoringUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <div>Initializing your account...</div>
        </div>
      </div>
    );
  }

  // If initial data is loading, show loading state
  if (!user || !plans || !chatSessions) {
    return (
      <div className="flex h-screen">
        <Suspense fallback={<div className="w-64 h-full border-r border-border" />}>
          <ChatHistory />
        </Suspense>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <div>Loading your chat history...</div>
          </div>
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

  // If there's an error, show error message
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
  if (isTokenLoading || !accessToken) {
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

// Export the wrapper as default
export default ChatHistoryContentWrapper; 