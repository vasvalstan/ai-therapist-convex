"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import dynamic from 'next/dynamic';
import { api } from "@/convex/_generated/api";
import { useQuery, useMutation } from "convex/react";
import { UpgradePrompt } from "@/components/hume/upgrade-prompt";
import { useAuth } from "@clerk/nextjs";
import HumeChat from "@/components/hume/chat";

// Dynamically import the chat page content to avoid SSR issues with Clerk
const ChatPageContent = dynamic(() => Promise.resolve(ChatContent), {
  ssr: false,
});

export default function ChatPage() {
  return <ChatPageContent />;
}

function ChatContent() {
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
  
  // Store user mutation
  const storeUser = useMutation(api.users.store);
  
  // Automatically create user if not found
  useEffect(() => {
    if (userId && user === null) {
      // User is authenticated but not in database, create them
      const createUser = async () => {
        try {
          await storeUser();
          // No need to reload, Convex will update the queries automatically
        } catch (err) {
          console.error("Error creating user:", err);
        }
      };
      
      createUser();
    }
  }, [userId, user, storeUser]);
  
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
      
      // Check minutes remaining
      if (user.minutesRemaining !== undefined && user.minutesRemaining <= 0) {
        setAccessStatus({
          hasAccess: false,
          reason: "You have used all your available minutes. Please upgrade your plan to continue.",
          limitType: "minutes"
        });
        return;
      }
      
      // Check session limits for free plan
      if (userPlan.key === "free" && userPlan.maxSessions && chatSessions.length >= userPlan.maxSessions) {
        setAccessStatus({
          hasAccess: false,
          reason: `You have reached your limit of ${userPlan.maxSessions} sessions. Please upgrade your plan to continue.`,
          limitType: "sessions"
        });
        return;
      }
      
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
      <div className="flex flex-col min-h-screen">
        <div className="p-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <UpgradePrompt reason={accessStatus.reason} />
        </div>
      </div>
    );
  }

  // If there's another error, show error message
  if (error) {
    return (
      <div className="flex flex-col min-h-screen">
        <div className="p-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </div>
        <div className="flex items-center justify-center flex-1">
          <div className="text-red-500">Error: {error}</div>
        </div>
      </div>
    );
  }

  // If token is still loading, show loading state
  if (!accessToken) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <div>Preparing your chat...</div>
        </div>
      </div>
    );
  }

  // If everything is good, show the chat
  return (
    <div className="flex flex-col min-h-screen">
      <HumeChat accessToken={accessToken} />
    </div>
  );
} 