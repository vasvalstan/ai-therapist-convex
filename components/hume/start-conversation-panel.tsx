"use client";

import { useVoice } from "@humeai/voice-react";
import { Button } from "@/components/ui/button";
import { MessageCircle, Sparkles, Clock, Shield, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@clerk/nextjs";
import { Controls } from "./controls";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "@/components/ui/use-toast";
import { useState, useEffect } from "react";

export function StartConversationPanel() {
  const { status, connect } = useVoice();
  const router = useRouter();
  const createSession = useMutation(api.chat.createChatSession);
  const [isStarting, setIsStarting] = useState(false);
  const { isSignedIn } = useAuth();
  const [pendingChatId, setPendingChatId] = useState<string | null>(null);
  const pathname = usePathname();
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;
  
  // Check if we're already on a specific chat page
  const isOnSpecificChatPage = pathname && pathname !== "/chat/history" && pathname.startsWith("/chat/");
  
  // Watch for voice connection status changes
  useEffect(() => {
    if (status.value === "connected" && pendingChatId) {
      // Wait a bit to ensure connection is stable
      const timer = setTimeout(() => {
        console.log("Voice connection stable, navigating to chat:", pendingChatId);
        // Navigate directly to the chat tab to avoid intermediate screens
        router.push(`/chat/${pendingChatId}?tab=chat`);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
    
    // Reset states if connection is lost
    if (status.value === "disconnected") {
      console.log("Voice connection lost, resetting state");
      setPendingChatId(null);
      setIsStarting(false);
    }
  }, [status.value, pendingChatId, router]);
  
  // Get user details to show plan information
  const userInfo = useQuery(api.users.getUser);
  const userDetails = useQuery(
    api.users.getUserByToken, 
    userInfo && userInfo !== "Not authenticated" ? { tokenIdentifier: userInfo.subject } : "skip"
  );
  
  // Get all plans to find the user's plan details
  const allPlans = useQuery(api.plans.getPlans);
  
  // Find the user's plan
  const userPlan = allPlans?.find(plan => plan.key === userDetails?.currentPlanKey) || 
                   allPlans?.find(plan => plan.key === "free");
  
  const handleStartConversation = async () => {
    if (!isSignedIn) {
      toast({
        title: "Sign in required",
        description: "Please sign in to start a conversation.",
        variant: "destructive",
      });
      return;
    }
    
    // If we're already on a specific chat page, don't create a new session
    if (isOnSpecificChatPage) {
      toast({
        title: "Chat already in progress",
        description: "You already have an active chat session.",
      });
      return;
    }
    
    try {
      setIsStarting(true);
      
      // First create the chat session with initial greeting
      console.log("Creating new chat session...");
      const result = await createSession({
        initialMessage: {
          role: "assistant",
          content: "Hi, I'm Sereni, your AI therapist. I'm here to listen and help you process your thoughts and feelings. What's on your mind today?",
        }
      });
      
      console.log("Create session result:", result);
      
      if (!result) {
        throw new Error("Failed to create chat session: No result returned");
      }
      
      // Handle both sessionId and chatId for backward compatibility
      // Use type assertion to avoid TypeScript errors
      const anyResult = result as any;
      const sessionIdentifier = anyResult.sessionId || anyResult.chatId;
      
      if (!sessionIdentifier) {
        console.error("Session creation response:", JSON.stringify(result));
        throw new Error("Failed to create chat session: No session identifier in response");
      }
      
      // Reset retry count on success
      setRetryCount(0);
      
      console.log("Chat session created:", sessionIdentifier);
      setPendingChatId(sessionIdentifier);
      
      // Then connect to voice
      console.log("Connecting to voice service...");
      if (connect) {
        await connect();
        console.log("Voice connection initiated");
        
        // Navigate directly to the chat page with the chat tab selected
        // This bypasses the intermediate screen
        console.log("Navigating directly to chat page:", sessionIdentifier);
        router.push(`/chat/${sessionIdentifier}?tab=chat`);
      } else {
        throw new Error("Voice service not available");
      }
    } catch (error) {
      console.error("Failed to start conversation:", error);
      // Provide more detailed error information
      let errorMessage = "Failed to start conversation";
      if (error instanceof Error) {
        errorMessage = error.message;
        console.error("Error stack:", error.stack);
      }
      
      // Implement retry logic
      if (retryCount < MAX_RETRIES) {
        setRetryCount(prev => prev + 1);
        console.log(`Retrying... Attempt ${retryCount + 1} of ${MAX_RETRIES}`);
        
        // Wait a moment before retrying
        setTimeout(() => {
          handleStartConversation();
        }, 1000);
        
        toast({
          title: "Retrying...",
          description: `Connection attempt ${retryCount + 1} of ${MAX_RETRIES}`,
        });
        return;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      setIsStarting(false);
      setPendingChatId(null);
      setRetryCount(0);
    }
  };
  
  return (
    <div className="flex flex-col items-center justify-center gap-8 p-8">
      {/* Plan information */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">
          Welcome to Sereni
        </h1>
        <p className="text-xl text-muted-foreground max-w-[600px] mx-auto">
          Your AI therapist, ready to listen and help you process your thoughts and feelings.
        </p>
      </div>
      
      {/* Plan features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-[900px] w-full">
        <div className="flex flex-col items-center gap-2 p-6 rounded-lg border bg-card text-card-foreground">
          <MessageCircle className="size-8 text-blue-500" />
          <h3 className="font-medium">Natural Conversation</h3>
          <p className="text-sm text-center text-muted-foreground">
            Have a natural voice conversation with an empathetic AI therapist
          </p>
        </div>
        
        <div className="flex flex-col items-center gap-2 p-6 rounded-lg border bg-card text-card-foreground">
          <Sparkles className="size-8 text-blue-500" />
          <h3 className="font-medium">Emotion Analysis</h3>
          <p className="text-sm text-center text-muted-foreground">
            Get insights into your emotional state during conversations
          </p>
        </div>
        
        <div className="flex flex-col items-center gap-2 p-6 rounded-lg border bg-card text-card-foreground">
          <Shield className="size-8 text-blue-500" />
          <h3 className="font-medium">Private & Secure</h3>
          <p className="text-sm text-center text-muted-foreground">
            Your conversations are private and encrypted
          </p>
        </div>
      </div>
      
      {/* Start conversation button */}
      <div className="flex flex-col items-center gap-4">
        <Button
          size="lg"
          onClick={handleStartConversation}
          disabled={isStarting || !isSignedIn || status.value === "connecting"}
          className="min-w-[200px]"
        >
          {isStarting ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              {status.value === "connecting" ? "Connecting..." : "Starting..."}
            </>
          ) : (
            "Start a conversation"
          )}
        </Button>
        
        {userDetails?.currentPlanKey === "free" && (
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            <Clock className="size-4" />
            {userPlan?.maxSessionDurationMinutes} minutes per session on Free plan
          </p>
        )}
      </div>
    </div>
  );
} 