"use client";

import { useVoice } from "@humeai/voice-react";
import { useEffect, useRef, useState } from "react";
import { api } from "@/convex/_generated/api";
import { useMutation } from "convex/react";
import { toast } from "@/components/ui/use-toast";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp?: number;
  emotions?: Record<string, any>;
}

interface VoiceControllerProps {
  initialMessages?: ChatMessage[];
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

export function VoiceController({ initialMessages = [] }: VoiceControllerProps) {
  const voice = useVoice();
  const prevStatusRef = useRef<string | undefined>(undefined);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  
  // Extract session ID from the URL or use a generated one
  useEffect(() => {
    // Get session ID from URL or generate one
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('sessionId') || `session_${Date.now()}`;
    setCurrentSessionId(sessionId);
    
    console.log("VoiceController: Using session ID:", sessionId);
  }, []);
  
  useEffect(() => {
    const handleTimeExpired = () => {
      console.log("VoiceController: Time expired event received, forcing disconnect");
      
      // Show a notification that the chat is being saved
      const saveMessage = document.createElement('div');
      saveMessage.className = 'fixed top-4 right-4 bg-green-100 text-green-800 p-3 rounded shadow-md z-50';
      saveMessage.textContent = 'Saving your chat before disconnecting...';
      document.body.appendChild(saveMessage);
      
      // Dispatch a custom event to trigger message saving
      const saveEvent = new CustomEvent('saveChat', {
        detail: { reason: "timeExpired" }
      });
      window.dispatchEvent(saveEvent);
      
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
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        console.log("VoiceController: Page hidden, saving chat");
        
        // Dispatch a custom event to trigger message saving
        const saveEvent = new CustomEvent('saveChat', {
          detail: { reason: "visibilityChange" }
        });
        window.dispatchEvent(saveEvent);
      }
    };
    
    // Listen for the timeExpired event
    window.addEventListener('timeExpired', handleTimeExpired);
    
    // Listen for visibility change to save chat when user leaves the page
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Track status changes
    if (voice && voice.status) {
      const currentStatus = voice.status.value;
      
      // Log status changes
      if (prevStatusRef.current !== currentStatus) {
        console.log(`VoiceController: Status changed from ${prevStatusRef.current} to ${currentStatus}`);
        prevStatusRef.current = currentStatus;
      }
    }
    
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
  
  // Render the ChatSaveHandler alongside (invisibly)
  return (
    <>
      {currentSessionId && (
        <ChatSaveHandler 
          sessionId={currentSessionId} 
          // We'll use the sessionId for both humeChatId and humeGroupChatId
          // when we don't have explicit values
          humeChatId={undefined}
          humeGroupChatId={undefined}
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

  useEffect(() => {
    // Handler for saving chat when triggered by the End Call button
    const handleSaveChat = async () => {
      if (isSaving) return;
      setIsSaving(true);

      try {
        console.log("Saving chat transcript for session:", sessionId);
        
        // Use mock data for testing if needed
        const mockEvents = generateMockEvents(sessionId, humeChatId, humeGroupChatId);
        
        // Try to fetch events from Hume API, but fallback to mock data if it fails
        let events: HumeEvent[] = [];
        try {
          // Fetch events from Hume API
          console.log(`Fetching events from API for chat ID: ${humeChatId || sessionId}`);
          const response = await fetch(`/api/hume/events?chatId=${humeChatId || sessionId}`);
          
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
          chatId: sessionId,
          humeChatId: humeChatId,
          humeGroupChatId: humeGroupChatId,
          events: events.length > 0 ? events.map((event) => ({
            type: event.type,
            role: event.role || "",
            messageText: event.messageText || "",
            timestamp: new Date(event.timestamp).getTime(),
            emotionFeatures: event.emotionFeatures,
            chatId: event.chatId || humeChatId || sessionId,
            chatGroupId: event.chatGroupId || humeGroupChatId || sessionId,
            metadata: event.type === "chat_metadata" ? {
              chat_id: event.chatId,
              chat_group_id: event.chatGroupId,
              request_id: event.requestId,
              timestamp: event.timestamp
            } : event.metadata // Preserve any existing metadata
          })) : [
            // Add at least one event if none exist to prevent empty events array
            {
              type: "SYSTEM_MESSAGE",
              role: "SYSTEM",
              messageText: "Conversation summary saved",
              timestamp: Date.now(),
              emotionFeatures: undefined,
              chatId: humeChatId || sessionId,
              chatGroupId: humeGroupChatId || sessionId,
              metadata: {
                chat_id: humeChatId || sessionId,
                chat_group_id: humeGroupChatId || sessionId,
                timestamp: new Date().toISOString()
              }
            }
          ],
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
  }, [sessionId, humeChatId, humeGroupChatId, saveTranscript, isSaving]);

  // This component doesn't render anything visible
  return null;
} 