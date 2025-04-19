"use client";

import { useVoice } from "@humeai/voice-react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Phone, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/use-toast";
import { useSaveTranscript } from "@/lib/hooks/useSaveTranscript";
import { FaceTrackingToggle } from "./FaceTrackingToggle";

interface ControlsProps {
  sessionId?: string;
  onEndConversation?: () => Promise<void>;
  onEndCallStart?: () => void;
}

export function Controls({ sessionId, onEndConversation, onEndCallStart }: ControlsProps) {
  const voice = useVoice();
  const { disconnect, status, isMuted, unmute, mute } = voice || {};
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const timeWarningRef = useRef<NodeJS.Timeout | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timeDisplay, setTimeDisplay] = useState("00:00");
  const [showTimeWarning, setShowTimeWarning] = useState(false);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { saveTranscript } = useSaveTranscript();
  
  const updateUserMinutes = useMutation(api.chat.updateUserRemainingMinutes);
  const updateTherapyProgress = useMutation(api.summary.updateTherapyProgress);
  
  // Get user's plan to check if they're on the free plan
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
  
  // Get the session duration limit based on the user's plan
  const planSessionDurationMinutes = userPlan?.maxSessionDurationMinutes || 5;
  const PLAN_LIMIT_SECONDS = planSessionDurationMinutes * 60;
  
  // Handle call end and update user minutes
  const handleEndCall = async (timeExpired = false) => {
    setIsLoading(true);
    onEndCallStart?.();
    try {
      // Clear the timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (timeWarningRef.current) {
        clearTimeout(timeWarningRef.current);
        timeWarningRef.current = null;
      }
      
      // Show a brief message to the user that their chat is being saved
      const saveMessage = document.createElement('div');
      saveMessage.className = 'fixed top-4 right-4 bg-green-100 text-green-800 p-3 rounded shadow-md z-50';
      saveMessage.textContent = 'Saving your chat...';
      document.body.appendChild(saveMessage);
      
      if (sessionStartTime && sessionId) {
        const sessionEndTime = Date.now();
        const sessionDurationMs = sessionEndTime - sessionStartTime;
        const sessionDurationMinutes = Math.ceil(sessionDurationMs / (1000 * 60)); // Round up to nearest minute
        
        console.log(`Call ended. Duration: ${sessionDurationMinutes} minutes (${Math.floor(sessionDurationMs / 1000)} seconds)`);
        
        try {
          // Use the saveTranscript hook to save the chat
          saveTranscript(timeExpired ? "timeExpired" : "userEnded");
          
          // Update therapy progress
          await updateTherapyProgress({ sessionId });
          console.log("✅ Updated therapy progress for session:", sessionId);
          
          // For free plan users, we don't need to update minutes since they have unlimited time
          if (isFreePlan) {
            saveMessage.innerHTML = `
              <div>
                <p>Your chat has been saved!</p>
                <p class="text-xs mt-1">
                  <span class="font-medium">${sessionDurationMinutes} minute${sessionDurationMinutes > 1 ? 's' : ''}</span> used.
                  <span class="font-medium">Unlimited</span> time remaining.
                </p>
              </div>
            `;
            
            setTimeout(() => {
              saveMessage.remove();
            }, 5000);
          } else {
            // Update paid plan user's remaining minutes
            const result = await updateUserMinutes({
              sessionDurationMinutes,
            });
            console.log("Updated user minutes:", result);
            
            // Dispatch an event to update the minutes display
            if (result.success) {
              const minutesUpdatedEvent = new CustomEvent('minutesUpdated', {
                detail: {
                  previousMinutesRemaining: result.previousMinutesRemaining,
                  newMinutesRemaining: result.newMinutesRemaining,
                  minutesUsed: result.minutesUsed,
                  planKey: result.planKey
                }
              });
              window.dispatchEvent(minutesUpdatedEvent);
              
              // Update the message to confirm chat was saved and show minutes remaining
              saveMessage.innerHTML = `
                <div>
                  <p>Your chat has been saved!</p>
                  <p class="text-xs mt-1">
                    <span class="font-medium">${sessionDurationMinutes} minute${sessionDurationMinutes > 1 ? 's' : ''}</span> used.
                    <span class="font-medium">${result.newMinutesRemaining} minute${result.newMinutesRemaining !== 1 ? 's' : ''}</span> remaining.
                  </p>
                </div>
              `;
              
              // If time expired or the user ran out of minutes, show the upgrade prompt
              if (timeExpired || result.newMinutesRemaining <= 0) {
                // We'll use a custom event to communicate with the parent component
                const timeExpiredEvent = new CustomEvent('timeExpired', {
                  detail: {
                    message: timeExpired 
                      ? `You've reached the ${planSessionDurationMinutes}-minute limit on your ${userDetails?.currentPlanKey} plan.`
                      : "You have used all your available minutes. Please upgrade your plan to continue."
                  }
                });
                window.dispatchEvent(timeExpiredEvent);
              }
            } else {
              saveMessage.textContent = 'Your chat has been saved!';
            }
            
            setTimeout(() => {
              saveMessage.remove();
            }, 5000);
          }
        } catch (err) {
          console.error("Failed to update user minutes:", err);
          saveMessage.textContent = 'Error saving chat';
          saveMessage.className = 'fixed top-4 right-4 bg-red-100 text-red-800 p-3 rounded shadow-md z-50';
          setTimeout(() => {
            saveMessage.remove();
          }, 3000);
        }
        
        setSessionStartTime(null);
        setElapsedSeconds(0);
      }
    } catch (error) {
      console.error("Unexpected error during handleEndCall:", error);
      toast({ title: "Error ending call", description: "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsLoading(false);
      if (disconnect) {
        disconnect();
      }
      router.push('/chat/history'); 
    }
  };

  // Set up timer when connected
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (status && status.value === "connected") {
      // Only set the start time if it's not already set
      if (!sessionStartTime) {
        console.log("Call connected, tracking time from:", new Date().toISOString());
        setSessionStartTime(Date.now());
      }
      
      // Start a timer to check elapsed time every second
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      timerRef.current = setInterval(() => {
        const currentTime = Date.now();
        const startTime = sessionStartTime || currentTime;
        const durationMs = currentTime - startTime;
        const durationSeconds = Math.floor(durationMs / 1000);
        
        setElapsedSeconds(durationSeconds);
        
        // Skip time limit check for free plan users
        if (!isFreePlan) {
          // Check if user has reached their plan's session duration limit
          if (durationSeconds >= PLAN_LIMIT_SECONDS) {
            console.log(`User reached ${planSessionDurationMinutes}-minute limit for their ${userDetails?.currentPlanKey || 'free'} plan`);
            // End the call with timeExpired=true to show the upgrade prompt
            handleEndCall(true);
          }
          // Show a warning when approaching the limit (10 seconds before)
          else if (durationSeconds === PLAN_LIMIT_SECONDS - 10) {
            const warningMessage = document.createElement('div');
            warningMessage.className = 'fixed top-4 right-4 bg-yellow-100 text-yellow-800 p-3 rounded shadow-md z-50';
            warningMessage.textContent = `Your session will end in 10 seconds. ${isFreePlan ? 'Upgrade for more time!' : ''}`;
            document.body.appendChild(warningMessage);
            
            // Remove the warning after 5 seconds
            timeWarningRef.current = setTimeout(() => {
              warningMessage.remove();
            }, 5000);
          }
        }
      }, 1000); // Check every second
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (timeWarningRef.current) {
        clearTimeout(timeWarningRef.current);
        timeWarningRef.current = null;
      }
    };
  }, [status, sessionStartTime, isFreePlan, PLAN_LIMIT_SECONDS, planSessionDurationMinutes, userDetails?.currentPlanKey]);

  // Format time as MM:SS
  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  // Display elapsed time
  const getTimeDisplay = () => {
    const formattedTime = formatTime(elapsedSeconds);
    const remainingSeconds = Math.max(0, PLAN_LIMIT_SECONDS - elapsedSeconds);
    const formattedRemaining = formatTime(remainingSeconds);
    const planName = userDetails?.currentPlanKey ? 
      userDetails.currentPlanKey.charAt(0).toUpperCase() + userDetails.currentPlanKey.slice(1) : 
      "Free";
    
    // If it's a free plan, show elapsed time and unlimited message
    if (isFreePlan) {
      return (
        <div className="text-xs space-y-1">
          <div className="flex items-center justify-center gap-2">
            <span className="text-muted-foreground">
              Session time: {formattedTime}
            </span>
          </div>
          <div className="flex items-center justify-center gap-1">
            <span className="text-green-600 font-medium">
              Unlimited time available
            </span>
          </div>
        </div>
      );
    }
    
    // For paid plans, show remaining time
    return (
      <div className="text-xs space-y-1">
        <div className="flex items-center justify-center gap-2">
          <span className={remainingSeconds < 30 ? "text-destructive font-medium" : "text-muted-foreground"}>
            {planName} plan time remaining: {formattedRemaining}
          </span>
        </div>
        
        <div className="flex items-center justify-center gap-1">
          {remainingSeconds < 30 ? (
            <span className="text-destructive font-medium">
              Your session will end soon!
            </span>
          ) : (
            <span className="text-muted-foreground">
              {planName} plan limited to {planSessionDurationMinutes} minutes
            </span>
          )}
        </div>
      </div>
    );
  };

  const handleEndConversation = async () => {
    if (!sessionId) return;
    
    try {
      setIsLoading(true);
      
      // If an external handler is provided, use it
      if (onEndConversation) {
        await onEndConversation();
        return;
      }
      
      // Use the saveTranscript hook
      saveTranscript("userEnded");
      
      // Update therapy progress
      await updateTherapyProgress({ sessionId });
      console.log("✅ Updated therapy progress for session:", sessionId);
      
      // Wait a bit to ensure data is saved then redirect
      setTimeout(() => {
        router.push("/chat/history");
      }, 1000);
    } catch (error) {
      console.error("Error ending conversation:", error);
      toast({
        title: "Error",
        description: "Failed to end conversation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 w-full p-2 flex items-center justify-center",
        "bg-gradient-to-t from-card via-card/90 to-card/0"
      )}
    >
      <AnimatePresence>
        {status && status.value === "connected" ? (
          <motion.div
            initial={{
              y: "100%",
              opacity: 0,
            }}
            animate={{
              y: 0,
              opacity: 1,
            }}
            exit={{
              y: "100%",
              opacity: 0,
            }}
            className="p-2 bg-card border border-border rounded-lg shadow-sm flex flex-col items-center gap-1"
          >
            {getTimeDisplay()}
            <div className="flex items-center gap-2">
              <Toggle
                pressed={!isMuted}
                onPressedChange={() => {
                  if (isMuted) {
                    if (unmute) {
                      unmute();
                    }
                  } else {
                    if (mute) {
                      mute();
                    }
                  }
                }}
                className="flex items-center gap-1 h-8 px-2"
              >
                {isMuted ? (
                  <>
                    <MicOff className="size-3" />
                    <span className="text-xs">Unmute</span>
                  </>
                ) : (
                  <>
                    <Mic className="size-3" />
                    <span className="text-xs">Mute</span>
                  </>
                )}
              </Toggle>

              {/* Face Tracking Toggle */}
              <FaceTrackingToggle className="mx-1 scale-90" />

              <Button
                size="sm"
                variant="destructive"
                className="rounded-full w-10 h-10 shadow-md"
                onClick={() => handleEndCall()}
                disabled={isLoading} 
              >
                {isLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Phone className="size-4" />
                )}
              </Button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}