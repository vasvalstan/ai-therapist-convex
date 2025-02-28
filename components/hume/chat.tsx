"use client";

import { VoiceProvider, useVoice, type JSONMessage } from "@humeai/voice-react";
import { Messages } from "./messages";
import { Controls } from "./controls";
import { StartCall } from "./start-call";
import { ComponentRef, useEffect, useRef, useState } from "react";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { UpgradePrompt } from "./upgrade-prompt";
import { Clock } from "lucide-react";

interface HumeChatProps {
  accessToken: string;
  sessionId?: string;
}

type MessageRole = "user" | "assistant";

// Define proper types for events
type TimeExpiredEvent = CustomEvent<{ message: string }>;
type MinutesUpdatedEvent = CustomEvent<{ 
  previousMinutesRemaining?: number;
  newMinutesRemaining?: number;
  minutesUsed?: number;
  planKey?: string;
}>;
type UpdateMinutesDisplayEvent = CustomEvent<{ minutesRemaining: number }>;

// Expanded message type to include all properties used in the component
type MessageType = {
  role: MessageRole;
  content: string;
  timestamp?: number;
  emotions?: Record<string, unknown>;
  saved?: boolean;
  data?: {
    role: MessageRole;
    content: string;
    emotions: Record<string, unknown>;
  };
};

// Component to display minutes remaining
function MinutesRemainingDisplay({ initialMinutes, planKey }: { initialMinutes: number, planKey?: string }) {
  const [minutesRemaining, setMinutesRemaining] = useState(initialMinutes);
  
  useEffect(() => {
    const handleUpdateMinutes = (event: UpdateMinutesDisplayEvent) => {
      if (event.detail && event.detail.minutesRemaining !== undefined) {
        console.log("Updating minutes display to:", event.detail.minutesRemaining);
        setMinutesRemaining(event.detail.minutesRemaining);
      }
    };
    
    window.addEventListener('updateMinutesDisplay', handleUpdateMinutes as EventListener);
    
    return () => {
      window.removeEventListener('updateMinutesDisplay', handleUpdateMinutes as EventListener);
    };
  }, []);
  
  return (
    <div className="sticky top-0 w-full bg-card/80 backdrop-blur-sm border-b border-border z-10 p-3 flex justify-between items-center">
      <div className="flex items-center gap-2 text-sm">
        <Clock className="h-4 w-4 text-blue-500" />
        <span>
          <strong>{minutesRemaining}</strong> minutes remaining on your {planKey || "free"} plan
        </span>
      </div>
      {planKey !== "premium" && (
        <a href="/pricing" className="text-xs text-blue-500 hover:underline">
          Upgrade for more time
        </a>
      )}
    </div>
  );
}

export default function HumeChat({ accessToken, sessionId: initialSessionId }: HumeChatProps) {
  const timeout = useRef<number | null>(null);
  const ref = useRef<ComponentRef<typeof Messages> | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(initialSessionId ?? null);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const createSession = useMutation(api.chat.createChatSession);
  const addMessage = useMutation(api.chat.addMessageToSession);
  
  // Get user's remaining minutes
  const userInfo = useQuery(api.users.getUser);
  const userDetails = useQuery(
    api.users.getUserByToken, 
    userInfo && userInfo !== "Not authenticated" ? { tokenIdentifier: userInfo.subject } : "skip"
  );
  
  // Listen for the timeExpired event
  useEffect(() => {
    const handleTimeExpired = (event: TimeExpiredEvent) => {
      console.log("Time expired event received:", event.detail);
      setError(event.detail.message);
    };

    window.addEventListener('timeExpired', handleTimeExpired as EventListener);
    
    return () => {
      window.removeEventListener('timeExpired', handleTimeExpired as EventListener);
    };
  }, []);
  
  // Listen for the minutesUpdated event to refresh user details
  useEffect(() => {
    const handleMinutesUpdated = (event: MinutesUpdatedEvent) => {
      console.log("Minutes updated event received:", event.detail);
      
      // Update the minutes display without refetching
      if (userDetails && event.detail && event.detail.newMinutesRemaining !== undefined) {
        // Create a custom event to update the UI with the new minutes
        const minutesDisplayEvent = new CustomEvent('updateMinutesDisplay', {
          detail: {
            minutesRemaining: event.detail.newMinutesRemaining
          }
        });
        window.dispatchEvent(minutesDisplayEvent);
      }
    };
    
    window.addEventListener('minutesUpdated', handleMinutesUpdated as EventListener);
    
    return () => {
      window.removeEventListener('minutesUpdated', handleMinutesUpdated as EventListener);
    };
  }, [userDetails]);

  // Listen for the saveChat event
  useEffect(() => {
    const handleSaveChat = async (event: Event) => {
      // Cast to CustomEvent to access detail property
      const customEvent = event as CustomEvent<{ sessionId?: string }>;
      console.log("Save chat event received:", customEvent.detail);
      
      if (messages.length > 0 && currentSessionId) {
        setIsSaving(true);
        
        // Try to save any pending messages
        try {
          let savedCount = 0;
          for (const msg of messages) {
            if (!msg.saved) {
              try {
                if (msg.data && msg.data.role && msg.data.content) {
                  await addMessage({
                    sessionId: currentSessionId,
                    message: msg.data,
                  });
                  msg.saved = true;
                  savedCount++;
                }
              } catch (err) {
                console.error("Failed to save messages on disconnect:", err);
              }
            }
          }
          
          if (savedCount > 0) {
            console.log(`Saved ${savedCount} pending messages after disconnection`);
          } else {
            console.log("No pending messages to save");
          }
        } catch (err) {
          console.error("Failed to save messages on disconnect:", err);
        } finally {
          setIsSaving(false);
        }
      }
    };

    window.addEventListener('saveChat', handleSaveChat);
    
    return () => {
      window.removeEventListener('saveChat', handleSaveChat);
    };
  }, [messages, currentSessionId, addMessage]);

  // Handle page unload or visibility change to save messages
  useEffect(() => {
    const handleBeforeUnload = async () => {
      if (messages.length > 0 && currentSessionId) {
        // Show a message to the user
        const saveMessage = document.createElement('div');
        saveMessage.className = 'fixed top-4 right-4 bg-green-100 text-green-800 p-3 rounded shadow-md z-50';
        saveMessage.textContent = 'Saving your chat...';
        document.body.appendChild(saveMessage);
        
        setIsSaving(true);
        
        try {
          for (const msg of messages) {
            if (!msg.saved) {
              try {
                if (msg.data && msg.data.role && msg.data.content) {
                  await addMessage({
                    sessionId: currentSessionId,
                    message: msg.data,
                  });
                  msg.saved = true;
                }
              } catch (err) {
                console.error("Failed to save messages on unload:", err);
              }
            }
          }
          
          saveMessage.textContent = 'Your chat has been saved!';
        } catch (err) {
          console.error("Failed to save messages on unload:", err);
          saveMessage.textContent = 'Error saving chat';
          saveMessage.className = 'fixed top-4 right-4 bg-red-100 text-red-800 p-3 rounded shadow-md z-50';
        }
        
        setTimeout(() => {
          saveMessage.remove();
          setIsSaving(false);
        }, 2000);
      }
    };
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && messages.length > 0 && currentSessionId) {
        handleBeforeUnload();
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [messages, currentSessionId, addMessage]);

  // Log when error state changes
  useEffect(() => {
    if (error) {
      console.log("Error state changed:", error);
    }
  }, [error]);

  const handleMessage = async (message: JSONMessage) => {
    if (timeout.current) {
      window.clearTimeout(timeout.current);
    }

    // Handle message storage
    if (message.type === "user_message" || message.type === "assistant_message") {
      const messageData = {
        role: (message.type === "user_message" ? "user" : "assistant") as MessageRole,
        content: message.message?.content || "",
        emotions: message.models?.prosody?.scores || {},
      };
      
      // Update the messages state with the new message
      setMessages((prev) => [
        ...prev,
        {
          role: message.type === "user_message" ? "user" : "assistant",
          content: message.message?.content || "",
          timestamp: Date.now(),
          emotions: message.models?.prosody?.scores || {},
          data: {
            role: message.type === "user_message" ? "user" : "assistant",
            content: message.message?.content || "",
            emotions: message.models?.prosody?.scores || {},
          },
          saved: false,
        },
      ]);

      try {
        // If no session exists, create one with the initial message
        if (!currentSessionId) {
          const result = await createSession({
            initialMessage: messageData
          });
          if (result?.sessionId) {
            setCurrentSessionId(result.sessionId);
          }
          // Mark message as saved
          messages[messages.length - 1].saved = true;
        } else {
          // Add message to existing session
          await addMessage({
            sessionId: currentSessionId,
            message: messageData,
          });
          // Mark message as saved
          messages[messages.length - 1].saved = true;
        }
        // Clear any previous errors
        setError(null);
      } catch (err: unknown) {
        // Handle errors related to plan limits
        const errorMessage = err instanceof Error ? err.message : "An error occurred";
        setError(errorMessage);
        console.error("Chat error:", err);
      }
    }

    timeout.current = window.setTimeout(() => {
      if (ref.current) {
        const scrollHeight = ref.current.scrollHeight;
        ref.current.scrollTo({
          top: scrollHeight,
          behavior: "smooth",
        });
      }
    }, 200);
  };

  if (!accessToken) {
    return <div>Loading...</div>;
  }

  // If there's an error related to plan limits, show the upgrade prompt
  if (error && (error.includes("session limit") || error.includes("minutes") || error.includes("upgrade"))) {
    console.log("Showing upgrade prompt due to error:", error);
    return (
      <div className="relative flex-1 flex flex-col mx-auto w-full h-full">
        <UpgradePrompt reason={error} />
      </div>
    );
  }

  return (
    <div className="relative flex-1 flex flex-col mx-auto w-full overflow-hidden">
      {isSaving && (
        <div className="fixed top-4 right-4 bg-green-100 text-green-800 p-3 rounded shadow-md z-50">
          Saving your chat...
        </div>
      )}
      
      {/* Minutes Remaining Display */}
      {userDetails && userDetails.minutesRemaining !== undefined && (
        <MinutesRemainingDisplay 
          initialMinutes={userDetails.minutesRemaining} 
          planKey={userDetails.currentPlanKey} 
        />
      )}
      
      <VoiceProvider
        auth={{ type: "accessToken", value: accessToken }}
        configId={process.env.NEXT_PUBLIC_HUME_CONFIG_ID}
        onMessage={handleMessage}
      >
        <VoiceController />
        <Messages ref={ref} />
        <Controls />
        <StartCall />
      </VoiceProvider>
    </div>
  );
}

// This component will handle the voice instance and disconnect on time expired
function VoiceController() {
  const voice = useVoice();
  const prevStatusRef = useRef<string | undefined>(undefined);
  
  useEffect(() => {
    const handleTimeExpired = () => {
      console.log("VoiceController: Time expired event received, forcing disconnect");
      
      // Show a notification that the chat is being saved
      const saveMessage = document.createElement('div');
      saveMessage.className = 'fixed top-4 right-4 bg-green-100 text-green-800 p-3 rounded shadow-md z-50';
      saveMessage.textContent = 'Saving your chat before disconnecting...';
      document.body.appendChild(saveMessage);
      
      // Give a small delay to allow any pending messages to be saved
      setTimeout(() => {
        if (voice && voice.disconnect) {
          voice.disconnect();
        }
        
        // Update the message
        saveMessage.textContent = 'Your chat has been saved!';
        setTimeout(() => {
          saveMessage.remove();
        }, 3000);
      }, 1000);
    };
    
    window.addEventListener('timeExpired', handleTimeExpired);
    
    return () => {
      window.removeEventListener('timeExpired', handleTimeExpired);
    };
  }, [voice]);
  
  // Monitor status changes using useEffect
  useEffect(() => {
    if (voice && voice.status) {
      const currentStatus = voice.status.value;
      
      // If status changed to disconnected
      if (prevStatusRef.current && 
          prevStatusRef.current !== currentStatus && 
          currentStatus === "disconnected") {
        console.log("Call disconnected, ensuring chat is saved");
        
        // Dispatch a custom event to trigger message saving
        const saveEvent = new CustomEvent('saveChat', {
          detail: { reason: "disconnected" }
        });
        window.dispatchEvent(saveEvent);
      }
      
      // Update the previous status
      prevStatusRef.current = currentStatus;
    }
  }, [voice, voice?.status?.value]);
  
  return null; // This component doesn't render anything
} 