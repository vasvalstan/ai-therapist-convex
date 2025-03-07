"use client";

import { useVoice } from "@humeai/voice-react";
import { Button } from "@/components/ui/button";
import { MessageCircle, Sparkles, Clock, Shield } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@clerk/nextjs";
import { Messages } from "./messages";
import { Controls } from "./controls";
import { useRef } from "react";

export function StartConversationPanel() {
  const { status, connect } = useVoice();
  const { userId } = useAuth();
  const messagesRef = useRef(null);
  
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
  
  const isFreePlan = userDetails?.currentPlanKey === "free";
  
  // If already connected, show the chat interface
  if (status.value === "connected") {
    return (
      <div className="flex-1 flex flex-col relative h-full">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 to-indigo-50/30 dark:from-blue-950/10 dark:to-indigo-950/10" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px]" />
        
        <div className="relative z-10 flex-1 flex flex-col">
          <Messages ref={messagesRef} />
          <div className="p-4">
            <Controls />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20" />
      
      {/* Background pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px]" />
      
      {/* Animated gradient orb */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full bg-blue-400/10 dark:bg-blue-400/5 blur-3xl animate-pulse" />
      
      <motion.div
        className="flex flex-col gap-8 items-center max-w-md p-8 rounded-lg bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-border shadow-sm z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div 
          className="text-center space-y-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <h2 className="text-2xl font-semibold">Start a New Conversation</h2>
          <p className="text-muted-foreground">
            Begin a new therapy session with our AI assistant
          </p>
        </motion.div>
        
        {/* Plan information */}
        {userPlan && (
          <motion.div 
            className="w-full p-4 rounded-lg bg-white dark:bg-gray-800 border border-border"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-blue-500" />
              <span className="font-medium">{userPlan.name}</span>
            </div>
            
            <div className="space-y-2 text-sm text-muted-foreground">
              {isFreePlan ? (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-green-500" />
                  <span>Unlimited time available</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <span>{userDetails?.minutesRemaining || 0} minutes remaining</span>
                </div>
              )}
              
              {userPlan.maxSessionDurationMinutes && !isFreePlan && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <span>Up to {userPlan.maxSessionDurationMinutes} min per session</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
        
        <motion.div 
          className="w-full max-w-xs"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <Button
            className="w-full flex items-center gap-2 py-6 bg-blue-600 hover:bg-blue-500"
            size="lg"
            onClick={() => {
              connect()
                .then(() => {})
                .catch(() => {})
                .finally(() => {});
            }}
          >
            <MessageCircle className="size-5" />
            <span className="text-base">Start conversation</span>
          </Button>
        </motion.div>
        
        <motion.div 
          className="text-sm text-muted-foreground text-center space-y-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <div className="flex items-center justify-center gap-1">
            <Shield className="h-3 w-3" />
            <p>Your conversations are private and secure</p>
          </div>
          <p>Sessions are saved automatically to your history</p>
        </motion.div>
      </motion.div>
    </div>
  );
} 