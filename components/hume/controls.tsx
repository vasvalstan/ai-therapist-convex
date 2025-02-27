"use client";

import { useVoice } from "@humeai/voice-react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Phone } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";
import { api } from "@/convex/_generated/api";
import { useMutation } from "convex/react";
import { useEffect, useRef, useState } from "react";

export function Controls() {
  const voice = useVoice();
  const { disconnect, status, isMuted, unmute, mute } = voice || {};
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  const updateUserMinutes = useMutation(api.chat.updateUserRemainingMinutes);
  
  // Start tracking time when call is connected
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
        
        console.log(`Timer update: ${durationSeconds} seconds elapsed`);
        setElapsedSeconds(durationSeconds);
      }, 1000); // Check every second
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [status, sessionStartTime]);

  // Handle call end and update user minutes
  const handleEndCall = async (timeExpired = false) => {
    // Clear the timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Show a brief message to the user that their chat is being saved
    const saveMessage = document.createElement('div');
    saveMessage.className = 'fixed top-4 right-4 bg-green-100 text-green-800 p-3 rounded shadow-md z-50';
    saveMessage.textContent = 'Saving your chat...';
    document.body.appendChild(saveMessage);
    
    if (sessionStartTime) {
      const sessionEndTime = Date.now();
      const sessionDurationMs = sessionEndTime - sessionStartTime;
      const sessionDurationMinutes = Math.ceil(sessionDurationMs / (1000 * 60)); // Round up to nearest minute
      
      console.log(`Call ended. Duration: ${sessionDurationMinutes} minutes (${Math.floor(sessionDurationMs / 1000)} seconds)`);
      
      try {
        // Update user's remaining minutes
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
          
          // Only show the upgrade prompt if the user actually ran out of minutes
          if (result.newMinutesRemaining <= 0 && timeExpired) {
            // We'll use a custom event to communicate with the parent component
            const timeExpiredEvent = new CustomEvent('timeExpired', {
              detail: {
                message: "You have used all your available minutes. Please upgrade your plan to continue."
              }
            });
            window.dispatchEvent(timeExpiredEvent);
            
            // Force disconnect the call
            if (disconnect) {
              console.log("Forcing call disconnect due to time expiration");
              disconnect();
            }
          }
        } else {
          saveMessage.textContent = 'Your chat has been saved!';
        }
        
        setTimeout(() => {
          saveMessage.remove();
        }, 5000);
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
    
    // Disconnect the call if the function exists
    if (disconnect) {
      disconnect();
    }
  };

  // Format time as MM:SS
  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  // Display elapsed time
  const getTimeDisplay = () => {
    const formattedTime = formatTime(elapsedSeconds);
    const elapsedMinutes = Math.floor(elapsedSeconds / 60);
    const secondsInCurrentMinute = elapsedSeconds % 60;
    
    return (
      <div className="text-xs space-y-1">
        <div className="flex items-center justify-center gap-2">
          <span className={elapsedMinutes >= 1 ? "text-destructive font-medium" : "text-muted-foreground"}>
            Session time: {formattedTime}
          </span>
        </div>
        
        <div className="flex items-center justify-center gap-1">
          {elapsedMinutes >= 1 ? (
            <span className="text-destructive font-medium">
              {elapsedMinutes} minute{elapsedMinutes > 1 ? 's' : ''} will be deducted
            </span>
          ) : (
            <span className="text-muted-foreground">
              {60 - secondsInCurrentMinute} seconds until 1 minute is deducted
            </span>
          )}
        </div>
        
        {elapsedMinutes >= 1 && (
          <div className="text-destructive font-medium text-center">
            End call now to save minutes!
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 w-full p-4 flex items-center justify-center",
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
            className="p-4 bg-card border border-border rounded-lg shadow-sm flex flex-col items-center gap-2"
          >
            {getTimeDisplay()}
            <div className="flex items-center gap-4">
              <Toggle
                pressed={!isMuted}
                onPressedChange={() => {
                  if (isMuted) {
                    unmute && unmute();
                  } else {
                    mute && mute();
                  }
                }}
                className="flex items-center gap-2"
              >
                {isMuted ? (
                  <>
                    <MicOff className="size-4" />
                    <span className="text-sm">Unmute</span>
                  </>
                ) : (
                  <>
                    <Mic className="size-4" />
                    <span className="text-sm">Mute</span>
                  </>
                )}
              </Toggle>

              <Button
                className="flex items-center gap-1.5 ml-2"
                onClick={() => handleEndCall(false)}
                variant="destructive"
                size="sm"
              >
                <Phone
                  className="size-4 opacity-70"
                  strokeWidth={2}
                  stroke="currentColor"
                />
                <span>End Call</span>
              </Button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
} 