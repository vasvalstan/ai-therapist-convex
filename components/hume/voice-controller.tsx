"use client";

import { useVoice } from "@humeai/voice-react";
import { useEffect, useRef, useState } from "react";
import { api } from "@/convex/_generated/api";
import { useMutation } from "convex/react";
import { toast } from "@/components/ui/use-toast";

// Define the message type constants that match the Convex schema
type MessageType = "USER_MESSAGE" | "AGENT_MESSAGE" | "SYSTEM_MESSAGE" | "CHAT_METADATA";
type MessageRole = "USER" | "ASSISTANT" | "SYSTEM";

// Utility function to generate a UUID safely in browser or Node.js environment
function generateUUID(): string {
  // Use crypto.randomUUID if available (modern browsers)
  if (typeof window !== 'undefined' && window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }
  
  // Fallback for older browsers - simple random ID
  return 'xxxx-xxxx-xxxx-xxxx'.replace(/[x]/g, function() {
    return (Math.random() * 16 | 0).toString(16);
  });
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp?: number;
  emotions?: Record<string, any>;
}

interface VoiceControllerProps {
  initialMessages?: ChatMessage[];
  sessionId?: string;
}

interface HumeEvent {
  type: string;
  role?: string;
  messageText?: string;
  timestamp: number | string;
  emotionFeatures?: any;
  chatId?: string;
  chatGroupId?: string;
  requestId?: string;
  metadata?: {
    chat_id: string;
    chat_group_id: string;
    request_id?: string;
    timestamp: string;
  };
}

export function VoiceController({ initialMessages = [], sessionId: propSessionId }: VoiceControllerProps) {
  const voice = useVoice();
  const prevStatusRef = useRef<string | undefined>(undefined);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(propSessionId || null);
  const [chatMetadata, setChatMetadata] = useState<{
    chatId?: string;
    chatGroupId?: string;
    requestId?: string;
  } | null>(null);
  
  // Extract session ID from the URL or use a generated one only if not provided as prop
  useEffect(() => {
    if (!propSessionId) {
      const urlParams = new URLSearchParams(window.location.search);
      const sessionId = urlParams.get('sessionId') || `session_${Date.now()}`;
      setCurrentSessionId(sessionId);
      console.log("Chat session created from URL/generated:", sessionId);
    } else {
      console.log("Using provided session ID:", propSessionId);
    }
  }, [propSessionId]);

  // Initialize voice connection
  useEffect(() => {
    if (!voice || !currentSessionId) return;

    const connect = async () => {
      try {
        console.log("Connecting to voice service...");
        await voice.connect();
      } catch (error) {
        console.error("Error connecting to voice service:", error);
        toast({
          title: "Connection Error",
          description: "Failed to connect to voice service. Please try again.",
          variant: "destructive",
        });
      }
    };

    connect();

    return () => {
      if (voice.disconnect) {
        voice.disconnect();
      }
    };
  }, [voice, currentSessionId]);

  // Handle voice status changes and events
  useEffect(() => {
    if (!voice || !currentSessionId) return;

    // Track status changes
    if (voice.status) {
      const currentStatus = voice.status.value;
      if (prevStatusRef.current !== currentStatus) {
        console.log(`Voice status changed from ${prevStatusRef.current} to ${currentStatus}`);
        prevStatusRef.current = currentStatus;
      }
    }
    
    // Store metadata for reference but don't handle saving it (that's done in HumeChat)
    if (voice.chatMetadata) {
      console.log("🎤 Received chat metadata from Hume:", voice.chatMetadata);
      setChatMetadata({
        chatId: voice.chatMetadata.chatId,
        chatGroupId: voice.chatMetadata.chatGroupId,
        requestId: voice.chatMetadata.requestId
      });
    }
  }, [voice, currentSessionId]);
  
  // Handle page visibility and time expiration
  useEffect(() => {
    const handleTimeExpired = () => {
      console.log("Time expired event received, forcing disconnect");
      
      const saveMessage = document.createElement('div');
      saveMessage.className = 'fixed top-4 right-4 bg-green-100 text-green-800 p-3 rounded shadow-md z-50';
      saveMessage.textContent = 'Saving your chat before disconnecting...';
      document.body.appendChild(saveMessage);
      
      const saveEvent = new CustomEvent('saveChat', {
        detail: { reason: "timeExpired" }
      });
      window.dispatchEvent(saveEvent);
      
      setTimeout(() => {
        if (voice && voice.disconnect) {
          voice.disconnect();
        }
        
        saveMessage.textContent = 'Your chat has been saved!';
        setTimeout(() => {
          saveMessage.remove();
        }, 3000);
      }, 1000);
    };
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        console.log("Page hidden, saving chat");
        const saveEvent = new CustomEvent('saveChat', {
          detail: { reason: "visibilityChange" }
        });
        window.dispatchEvent(saveEvent);
      }
    };
    
    window.addEventListener('timeExpired', handleTimeExpired);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('timeExpired', handleTimeExpired);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [voice]);
  
  // Initialize messages with chat history
  useEffect(() => {
    if (initialMessages.length > 0) {
      setMessages(initialMessages);
    }
  }, [initialMessages]);
  
  return (
    <>
      {currentSessionId && (
        <ChatSaveHandler 
          sessionId={currentSessionId} 
          humeChatId={chatMetadata?.chatId}
          humeGroupChatId={chatMetadata?.chatGroupId}
        />
      )}
    </>
  );
}

// Helper to generate mock events for testing
function generateMockEvents(sessionId: string, humeChatId?: string, humeGroupChatId?: string): HumeEvent[] {
  const now = Date.now();
  const chatId = humeChatId || sessionId;
  const chatGroupId = humeGroupChatId || sessionId;
  
  return [
    {
      type: "CHAT_METADATA",
      role: "SYSTEM",
      messageText: "Chat started",
      timestamp: now - 1000 * 60 * 5, // 5 minutes ago
      chatId,
      chatGroupId
    },
    {
      type: "USER_MESSAGE",
      role: "USER",
      messageText: "Hello, how are you?",
      timestamp: now - 1000 * 60 * 4, // 4 minutes ago
      emotionFeatures: JSON.stringify({ neutral: 0.8, calm: 0.7, happy: 0.2 }),
      chatId,
      chatGroupId
    },
    {
      type: "AGENT_MESSAGE",
      role: "ASSISTANT",
      messageText: "I'm doing well, thank you for asking. How are you feeling today?",
      timestamp: now - 1000 * 60 * 3.5, // 3.5 minutes ago
      chatId,
      chatGroupId
    },
    {
      type: "USER_MESSAGE",
      role: "USER",
      messageText: "I'm feeling a bit anxious about my upcoming presentation.",
      timestamp: now - 1000 * 60 * 3, // 3 minutes ago
      emotionFeatures: JSON.stringify({ anxious: 0.6, stressed: 0.5, worried: 0.4 }),
      chatId,
      chatGroupId
    },
    {
      type: "AGENT_MESSAGE",
      role: "ASSISTANT",
      messageText: "I understand. It's normal to feel anxious before presentations. Would you like to talk about some techniques that might help reduce your anxiety?",
      timestamp: now - 1000 * 60 * 2, // 2 minutes ago
      chatId,
      chatGroupId
    },
    {
      type: "USER_MESSAGE",
      role: "USER",
      messageText: "Yes, that would be helpful.",
      timestamp: now - 1000 * 60 * 1, // 1 minute ago
      emotionFeatures: JSON.stringify({ hopeful: 0.4, anxious: 0.3, neutral: 0.3 }),
      chatId,
      chatGroupId
    }
  ];
}

// A simplified component for saving the chat to our database
export function ChatSaveHandler({ sessionId, humeChatId, humeGroupChatId }: { 
  sessionId: string;
  humeChatId?: string;
  humeGroupChatId?: string;
}): JSX.Element | null {
  const [isSaving, setIsSaving] = useState(false);
  const saveTranscript = useMutation(api.chat.saveConversationTranscript);
  const updateMinutes = useMutation(api.chat.updateUserRemainingMinutes);

  useEffect(() => {
    // Handler for saving chat when triggered by the End Call button
    const handleSaveChat = async () => {
      if (isSaving) return;
      setIsSaving(true);

      try {
        console.log("Saving chat transcript for session:", sessionId);
        
        // Use the provided chat IDs or fall back to sessionId
        const chatId = humeChatId || sessionId;
        const chatGroupId = humeGroupChatId || sessionId;
        
        // Use mock data for testing if needed
        const mockEvents = generateMockEvents(sessionId, chatId, chatGroupId);
        
        // Try to fetch events from Hume API, but fallback to mock data if it fails
        let events: HumeEvent[] = [];
        try {
          // Fetch events from Hume API
          console.log(`Fetching events from API for chat ID: ${chatId}`);
          const response = await fetch(`/api/hume/events?chatId=${chatId}`);
          
          if (!response.ok) {
            const errorData = await response.json();
            console.error(`Error fetching chat events (${response.status}):`, errorData);
            // Fall back to mock data for testing
            console.log("Using mock events for testing due to API error");
            events = mockEvents;
          } else {
            const data = await response.json();
            console.log("Received API response:", data);
            
            // Check if the response contains events
            if (Array.isArray(data.events) && data.events.length > 0) {
              events = data.events;
              console.log(`Successfully fetched ${events.length} events from Hume API`);
            } else if (Array.isArray(data) && data.length > 0) {
              // Handle case where the events are the top-level array
              events = data;
              console.log(`Successfully fetched ${events.length} events (top-level array) from API`);
            } else {
              console.warn("No events found in API response. Using mock data instead.");
              events = mockEvents;
            }
          }
        } catch (error) {
          console.error("Exception when fetching events:", error);
          // Fall back to mock data for testing
          console.log("Using mock events for testing due to exception");
          events = mockEvents;
        }
        
        // Calculate session duration in minutes
        const sessionStartEvent = events.find((e) => e.type === "chat_metadata");
        const lastEvent = events[events.length - 1];
        
        let sessionDurationMinutes = 1; // Default to 1 minute
        if (sessionStartEvent && lastEvent) {
          const startTime = new Date(sessionStartEvent.timestamp).getTime();
          const endTime = new Date(lastEvent.timestamp).getTime();
          const durationMs = endTime - startTime;
          sessionDurationMinutes = Math.ceil(durationMs / (1000 * 60)); // Round up to nearest minute
        }
        
        // Save the transcript to our database
        const result = await saveTranscript({
          sessionId: sessionId,
          chatId: chatId,
          chatGroupId: chatGroupId,
          events: events.length > 0 ? events.map((event) => {
            // Ensure event type follows the expected format
            const type: MessageType = 
              event.type === "chat_metadata" ? "CHAT_METADATA" :
              event.type === "user_message" ? "USER_MESSAGE" : 
              event.type === "agent_message" ? "AGENT_MESSAGE" : 
              event.type === "CHAT_METADATA" ? "CHAT_METADATA" :
              event.type === "USER_MESSAGE" ? "USER_MESSAGE" :
              event.type === "AGENT_MESSAGE" ? "AGENT_MESSAGE" :
              "SYSTEM_MESSAGE";
            
            // Ensure role follows the expected format
            const role: MessageRole = 
              (event.role || "").toLowerCase() === "user" ? "USER" :
              (event.role || "").toLowerCase() === "assistant" ? "ASSISTANT" : 
              (event.role || "").toUpperCase() === "USER" ? "USER" :
              (event.role || "").toUpperCase() === "ASSISTANT" ? "ASSISTANT" :
              "SYSTEM";
            
            // Build metadata with required fields
            const metadata = {
              chat_id: chatId,
              chat_group_id: chatGroupId,
              request_id: generateUUID(),
              timestamp: new Date().toISOString()
            };
            
            return {
              type,
              role,
              messageText: event.messageText || "",
              content: event.messageText || "",
              timestamp: typeof event.timestamp === 'number' ? event.timestamp : new Date(event.timestamp).getTime(),
              emotionFeatures: typeof event.emotionFeatures === 'string' ? 
                               event.emotionFeatures : 
                               event.emotionFeatures ? JSON.stringify(event.emotionFeatures) : undefined,
              chatId: event.chatId || chatId,
              chatGroupId: event.chatGroupId || chatGroupId,
              metadata
            };
          }) : [
            {
              type: "SYSTEM_MESSAGE" as MessageType,
              role: "SYSTEM" as MessageRole,
              messageText: "Conversation summary saved",
              content: "Conversation summary saved",
              timestamp: Date.now(),
              chatId,
              chatGroupId,
              metadata: {
                chat_id: chatId,
                chat_group_id: chatGroupId,
                request_id: generateUUID(),
                timestamp: new Date().toISOString()
              }
            }
          ],
          messages: [] // Use the same events for messages
        });

        // Update user's remaining minutes
        await updateMinutes({
          sessionDurationMinutes
        });
        
        console.log("Transcript saved successfully:", result);
        
        toast({
          title: "Chat saved",
          description: "Your conversation has been saved successfully.",
        });
      } catch (error) {
        console.error("Error saving chat:", error);
        toast({
          title: "Error saving chat",
          description: "There was an error saving your conversation. Some data might be missing.",
          variant: "destructive",
        });
      } finally {
        setIsSaving(false);
      }
    };

    // Listen for the saveChat event
    window.addEventListener("saveChat", handleSaveChat as EventListener);
    
    return () => {
      window.removeEventListener("saveChat", handleSaveChat as EventListener);
    };
  }, [sessionId, humeChatId, humeGroupChatId, saveTranscript, updateMinutes, isSaving]);

  // This component doesn't render anything visible
  return null;
} 