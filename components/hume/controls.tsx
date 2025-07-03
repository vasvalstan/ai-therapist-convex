"use client";

// Add type declaration for global window properties
declare global {
  interface Window {
    activeMediaStreams?: MediaStream[];
    activeAudioContext?: AudioContext;
  }
}

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
      
      // Explicitly stop all media streams (audio and video)
      const cleanupMediaStreams = () => {
        console.log("🔍 MEDIA CLEANUP: Starting explicit cleanup of all media streams");
        
        // Method 1: Stop all tracks from active media devices
        if (navigator.mediaDevices) {
          // Get all active media tracks and stop them
          navigator.mediaDevices.enumerateDevices()
            .then(devices => {
              console.log(`🎤 MEDIA CLEANUP: Found ${devices.length} media devices`);
              
              // For each input device, try to get its stream and stop it
              const audioInputs = devices.filter(device => device.kind === 'audioinput');
              
              console.log(`🎤 MEDIA CLEANUP: Found ${audioInputs.length} audio inputs`);
              
              // Stop audio tracks
              if (audioInputs.length > 0) {
                console.log(`🎤 MEDIA CLEANUP: Attempting to get audio stream for cleanup`);
                navigator.mediaDevices.getUserMedia({ audio: true })
                  .then(stream => {
                    console.log(`🎤 MEDIA CLEANUP: Successfully got audio stream with ${stream.getAudioTracks().length} tracks`);
                    stream.getAudioTracks().forEach(track => {
                      console.log(`🎤 MEDIA CLEANUP: Stopping audio track: ${track.label}, enabled: ${track.enabled}, readyState: ${track.readyState}`);
                      track.stop();
                      console.log(`🎤 MEDIA CLEANUP: After stopping - readyState: ${track.readyState}`);
                    });
                  })
                  .catch(err => {
                    console.log(`🎤 MEDIA CLEANUP: Error getting audio stream: ${err.message}`);
                    
                    // Try an alternative approach - get all media streams from the page
                    console.log(`🎤 MEDIA CLEANUP: Trying alternative approach for audio cleanup`);
                    
                    // Look for audio and video elements in the DOM that might have active streams
                    const audioElements = document.querySelectorAll('audio');
                    const videoElements = document.querySelectorAll('video');
                    console.log(`🎤 MEDIA CLEANUP: Found ${audioElements.length} audio elements and ${videoElements.length} video elements in DOM`);
                    
                    // Clean up audio elements
                    audioElements.forEach((audio, index) => {
                      if (audio.srcObject instanceof MediaStream) {
                        console.log(`🎤 MEDIA CLEANUP: Found MediaStream in audio element ${index}`);
                        const stream = audio.srcObject;
                        const tracks = stream.getTracks();
                        console.log(`🎤 MEDIA CLEANUP: Stream has ${tracks.length} tracks`);
                        
                        tracks.forEach(track => {
                          console.log(`🎤 MEDIA CLEANUP: Stopping track: ${track.kind}, ${track.label}`);
                          track.stop();
                        });
                        
                        // Clear the srcObject
                        audio.srcObject = null;
                        console.log(`🎤 MEDIA CLEANUP: Cleared srcObject from audio element`);
                      }
                    });
                    
                    // Clean up any remaining video elements (from face tracking components)
                    videoElements.forEach((video, index) => {
                      if (video.srcObject instanceof MediaStream) {
                        console.log(`📹 MEDIA CLEANUP: Found MediaStream in video element ${index} (cleaning up legacy face tracking)`);
                        const stream = video.srcObject;
                        const tracks = stream.getTracks();
                        console.log(`📹 MEDIA CLEANUP: Video stream has ${tracks.length} tracks`);
                        
                        tracks.forEach(track => {
                          console.log(`📹 MEDIA CLEANUP: Stopping video track: ${track.kind}, ${track.label}`);
                          track.stop();
                        });
                        
                        // Clear the srcObject
                        video.srcObject = null;
                        console.log(`📹 MEDIA CLEANUP: Cleared srcObject from video element`);
                      }
                    });
                  });
              }
              
              // Skip video cleanup since we no longer use video/face tracking
            })
            .catch(err => console.error(`❌ MEDIA CLEANUP: Error enumerating devices: ${err.message}`));
        }
        
        // Method 2: Check for global stream references
        if (typeof window !== 'undefined') {
          // Stop any globally stored streams
          const globalStreams = window.activeMediaStreams || [];
          if (globalStreams.length > 0) {
            console.log(`🌐 MEDIA CLEANUP: Stopping ${globalStreams.length} globally stored streams`);
            globalStreams.forEach((stream: MediaStream, index: number) => {
              if (stream && typeof stream.getTracks === 'function') {
                const tracks = stream.getTracks();
                const audioTracks = stream.getAudioTracks();
                
                console.log(`🌐 MEDIA CLEANUP: Global stream ${index} has ${tracks.length} total tracks (${audioTracks.length} audio)`);
                
                tracks.forEach(track => {
                  console.log(`🌐 MEDIA CLEANUP: Stopping ${track.kind} track: ${track.label}, enabled: ${track.enabled}, readyState: ${track.readyState}`);
                  track.stop();
                  console.log(`🌐 MEDIA CLEANUP: After stopping - readyState: ${track.readyState}`);
                });
              }
            });
            window.activeMediaStreams = [];
            console.log(`🌐 MEDIA CLEANUP: Cleared global media streams array`);
          } else {
            console.log(`🌐 MEDIA CLEANUP: No globally stored streams found`);
          }
          
          // Close any audio contexts
          const audioContext = window.activeAudioContext;
          if (audioContext && typeof audioContext.close === 'function') {
            console.log(`🔊 MEDIA CLEANUP: Closing active AudioContext, state: ${audioContext.state}`);
            // Only attempt to close if the AudioContext is not already closed
            if (audioContext.state !== 'closed') {
              audioContext.close().then(() => {
                console.log(`🔊 MEDIA CLEANUP: Successfully closed AudioContext`);
              }).catch((err: any) => {
                console.error(`❌ MEDIA CLEANUP: Error closing AudioContext: ${err.message}`);
              });
            } else {
              console.log(`🔊 MEDIA CLEANUP: AudioContext already closed, skipping close operation`);
            }
            delete window.activeAudioContext;
            console.log(`🔊 MEDIA CLEANUP: Removed global AudioContext reference`);
          } else {
            console.log(`🔊 MEDIA CLEANUP: No active AudioContext found`);
          }
        }
        
        // Method 3: Try to revoke all media permissions
        if (navigator.permissions && navigator.permissions.query) {
          console.log(`🔐 MEDIA CLEANUP: Checking media permissions`);
          
          // Check microphone permission
          navigator.permissions.query({ name: 'microphone' as PermissionName })
            .then(permissionStatus => {
              console.log(`🎤 MEDIA CLEANUP: Microphone permission status: ${permissionStatus.state}`);
            })
            .catch(err => console.log(`🎤 MEDIA CLEANUP: Error checking microphone permission: ${err.message}`));
          
          // Skip camera permission check since we no longer use camera
        }
        
        console.log(`✅ MEDIA CLEANUP: Completed all cleanup methods`);
      };
      
      // Run the cleanup
      cleanupMediaStreams();
      
      // Dispatch a custom event to notify all components that the call has ended
      window.dispatchEvent(new CustomEvent('hume:call-ended', {
        detail: { 
          sessionId,
          timeExpired,
          timestamp: Date.now()
        }
      }));
      
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