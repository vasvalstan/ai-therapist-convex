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
        // Navigate directly to the chat tab to avoid intermediate screens
        router.push(`/chat/${pendingChatId}?tab=chat`);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
    
    // Reset states if connection is lost
    if (status.value === "disconnected") {
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
      // Redirect to Clerk sign-in page using Next.js router
      router.push('/sign-in');
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
          type: "AGENT_MESSAGE",
          role: "ASSISTANT",
          messageText: "Hi, I'm Sereni, your AI therapist. I'm here to listen and help you process your thoughts and feelings. What's on your mind today?",
          content: "Hi, I'm Sereni, your AI therapist. I'm here to listen and help you process your thoughts and feelings. What's on your mind today?",
          timestamp: Date.now(),
        }
        // Don't provide chatId or chatGroupId - these will be populated by updateHumeChatIds
        // when chat_metadata is received from Hume
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
    <div className="flex flex-col items-center justify-center gap-6 px-4 py-8 md:gap-8 md:p-8">
      {/* Welcome heading */}
      <div className="text-center space-y-2 max-w-[600px]">
        <h1 className="text-2xl md:text-4xl font-bold tracking-tight">
          Welcome to Sereni
        </h1>
        <p className="text-base md:text-xl text-muted-foreground">
          Your AI therapist, ready to listen and help process your thoughts and feelings.
        </p>
      </div>
      
      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-[900px]">
        <div className="flex flex-col items-center gap-2 p-4 rounded-lg border bg-card text-card-foreground">
          <MessageCircle className="h-6 w-6 md:h-8 md:w-8 text-blue-500" />
          <h3 className="font-medium text-center">Natural Conversation</h3>
          <p className="text-xs md:text-sm text-center text-muted-foreground">
            Voice conversations with an empathetic AI therapist
          </p>
        </div>
        
        <div className="flex flex-col items-center gap-2 p-4 rounded-lg border bg-card text-card-foreground">
          <Sparkles className="h-6 w-6 md:h-8 md:w-8 text-blue-500" />
          <h3 className="font-medium text-center">Emotion Analysis</h3>
          <p className="text-xs md:text-sm text-center text-muted-foreground">
            Get insights into your emotional state
          </p>
        </div>
        
        <div className="flex flex-col items-center gap-2 p-4 rounded-lg border bg-card text-card-foreground">
          <Shield className="h-6 w-6 md:h-8 md:w-8 text-blue-500" />
          <h3 className="font-medium text-center">Private & Secure</h3>
          <p className="text-xs md:text-sm text-center text-muted-foreground">
            Your conversations are private and secure
          </p>
        </div>
      </div>
      
      {/* Start button */}
      <Button 
        size="lg"
        onClick={handleStartConversation}
        disabled={isStarting}
        className="mt-4 px-8"
      >
        {isStarting ? (
          <>
            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-r-transparent" />
            Starting...
          </>
        ) : (
          <>
            <MessageCircle className="mr-2 h-5 w-5" />
            Start New Conversation
          </>
        )}
      </Button>
      
      {/* User plan info */}
      {userDetails && userPlan?.name && (
        <div className="text-sm text-muted-foreground text-center mt-2">
          <div className="font-medium">{userPlan.name}</div>
        </div>
      )}
    </div>
  );
} 