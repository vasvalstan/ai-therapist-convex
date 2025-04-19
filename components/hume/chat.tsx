"use client";

import { useVoice } from "@humeai/voice-react";
import { Messages } from "./messages";
import { Controls } from "./controls";
import { StartCall } from "./start-call";
import { ComponentRef, useEffect, useRef, useState, useCallback } from "react";
import { api } from "@/convex/_generated/api";
import { useMutation } from "convex/react";
import { ChatSaveHandler } from "./voice-controller";
import { Id } from "@/convex/_generated/dataModel";

const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds

interface HumeChatProps {
  accessToken: string;
  sessionId?: string;
  onEndCallStart?: () => void;
}

type MessageRole = "user" | "assistant";

interface InitialMessage {
  role: MessageRole;
  content: string;
  metadata?: {
    chat_id: string;
    chat_group_id: string;
    request_id: string;
    timestamp: string;
  };
}

interface MessageData {
  type: string;
  role: MessageRole;
  messageText: string;
  content: string;
  timestamp: number;
  emotionFeatures?: any;
  chatId?: string;
  chatGroupId?: string;
  metadata?: {
    chat_id: string;
    chat_group_id: string;
    request_id: string;
    timestamp: string;
  };
}

interface Message {
  type: string;
  role: MessageRole;
  content: string;
  messageText: string;
  timestamp: number;
  emotionFeatures?: any;
  chatId?: string;
  chatGroupId?: string;
  metadata?: {
    chat_id: string;
    chat_group_id: string;
    request_id: string;
    timestamp: string;
  };
}

// Helper function to safely extract timestamp from possibly date object
const safeGetISOString = (value: any): string => {
  if (value === null || value === undefined) {
    return Date.now().toString();
  }
  
  if (typeof value === 'object') {
    // Handle Date objects
    if (value instanceof Date) {
      return value.getTime().toString();
    }
    // Try toISOString if available, then convert to timestamp
    if (typeof (value as any).toISOString === 'function') {
      try {
        const isoString = (value as Date).toISOString();
        return Date.parse(isoString).toString();
      } catch (e) {
        return Date.now().toString();
      }
    }
  }
  
  if (typeof value === 'string') {
    // Check if already a numeric string
    if (/^\d+$/.test(value)) {
      return value;
    }
    // Try to parse as date string
    const timestamp = Date.parse(value);
    if (!isNaN(timestamp)) {
      return timestamp.toString();
    }
  }
  
  if (typeof value === 'number') {
    return value.toString();
  }
  
  // Default fallback
  return Date.now().toString();
};

export default function HumeChat({ 
  accessToken, 
  sessionId: initialSessionId, 
  onEndCallStart 
}: HumeChatProps) {
  const timeout = useRef<number | null>(null);
  const inactivityTimeout = useRef<NodeJS.Timeout | null>(null);
  const ref = useRef<ComponentRef<typeof Messages> | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>(initialSessionId);
  const voice = useVoice(); // Use the existing voice connection
  
  // Track Hume chat IDs
  const [humeChatId, setHumeChatId] = useState<string | undefined>();
  const [humeGroupChatId, setHumeGroupChatId] = useState<string | undefined>();
  const [metadata, setMetadata] = useState<{ chat_id: string; chat_group_id: string; request_id: string; timestamp: string } | null>(null);
  
  // Use a ref to track whether metadata has been processed
  const metadataProcessedRef = useRef<boolean>(false);
  const lastActivityRef = useRef<number>(Date.now());

  const createSession = useMutation(api.chat.createChatSession);
  const addMessage = useMutation(api.chat.addMessageToSession);
  const updateChatMetadata = useMutation(api.chat.updateMetadata);
  const updateAndVerifyMetadata = useMutation(api.chat.updateAndVerifyMetadata);
  const updateTherapyProgress = useMutation(api.summary.updateTherapyProgress);

  // Function to handle session end
  const handleSessionEnd = useCallback(async (sessionId: string) => {
    try {
      // Use the session ID directly since we know it's the correct one from the database
      await updateTherapyProgress({ sessionId });
      console.log("✅ Updated therapy progress for session:", sessionId);
    } catch (error) {
      console.error("❌ Failed to update therapy progress:", error);
    }
  }, [updateTherapyProgress]);

  // Reset inactivity timer
  const resetInactivityTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (inactivityTimeout.current) {
      clearTimeout(inactivityTimeout.current);
    }
    if (currentSessionId) {
      inactivityTimeout.current = setTimeout(() => {
        handleSessionEnd(currentSessionId);
      }, INACTIVITY_TIMEOUT);
    }
  }, [currentSessionId, handleSessionEnd]);

  // Set up message handler for the existing voice connection
  const handleMessage = useCallback(
    async (message: any) => {
      resetInactivityTimer(); // Reset timer on any message
      
      console.log("⚡ handleMessage called with message type:", message.type);
      
      // Stringent type checking
      console.log("🔬 Message raw value:", JSON.stringify(message));
      console.log("🔬 Message type typeof:", typeof message.type);
      console.log("🔬 Message type comparison:", {
        direct: message.type === "chat_metadata",
        lowercase: message.type?.toLowerCase?.() === "chat_metadata",
        includes: message.type?.includes?.("metadata"),
        _debug: message._debug,
        receivedAt: message.receivedAt
      });
      
      console.log("🎯 Chat component received message:", {
        type: message.type,
        role: message.message?.role,
        content: message.message?.content,
        metadata: message.metadata,
        models: message.models
      });

      // Check explicitly for the chat_metadata event type
      console.log("🧪 Message type:", message.type, typeof message.type);

      // Handle chat_metadata event which is sent at the start of every chat session
      const isMetadataEvent = 
        message.type === "chat_metadata" || 
        message.type?.toLowerCase?.() === "chat_metadata" ||
        message._debug === true;
        
      if (isMetadataEvent && !metadataProcessedRef.current) {
        console.log("📋 Received chat_metadata event:", {
          chatId: message.chatId,
          chatGroupId: message.chatGroupId,
          requestId: message.requestId,
          receivedAt: message.receivedAt
        });
        
        // Mark metadata as processed to avoid duplicate processing
        metadataProcessedRef.current = true;
        
        // Store the chat IDs for later use
        setHumeChatId(message.chatId);
        setHumeGroupChatId(message.chatGroupId);
        
        // Store metadata in state for debugging
        const newMetadata = {
          chat_id: message.chatId,
          chat_group_id: message.chatGroupId,
          request_id: message.requestId,
          timestamp: safeGetISOString(message.receivedAt)
        };
        setMetadata(newMetadata);
        console.log("💾 Stored metadata in state:", newMetadata);

        // If we have a session, store the Hume chat IDs in our database
        if (currentSessionId) {
          try {
            console.log("💫 Updating chat metadata in database for session:", currentSessionId);
            
            // Convert receivedAt to a numeric timestamp string
            const receivedTimestamp = typeof message.receivedAt === 'string' ? 
              Date.parse(message.receivedAt) || Date.now() : 
              typeof message.receivedAt === 'object' && message.receivedAt !== null ? 
              (message.receivedAt instanceof Date ? message.receivedAt.getTime() : Date.now()) : 
              Date.now();
            
            await updateChatMetadata({
              sessionId: currentSessionId,
              chatId: message.chatId,
              chatGroupId: message.chatGroupId,
              requestId: message.requestId,
              receivedAt: receivedTimestamp.toString()
            });
            console.log("✅ Successfully stored chat metadata in database");
          } catch (error) {
            console.error("❌ Error storing chat metadata:", error);
            // Reset the processed flag so we can try again
            metadataProcessedRef.current = false;
          }
        }
        
        // Add CHAT_METADATA event to the session
        if (currentSessionId) {
          try {
            // Make sure timestamp in the metadata is a string representation of a number
            const timestampNum = typeof message.receivedAt === 'string' ? 
              Date.parse(message.receivedAt) : 
              typeof message.receivedAt === 'object' && message.receivedAt !== null && typeof message.receivedAt.toISOString === 'function' ?
              Date.parse(message.receivedAt.toISOString()) :
              Date.now();
              
            const metadataMessage = {
              type: "CHAT_METADATA" as const,
              role: "SYSTEM" as const,
              messageText: "Chat started",
              content: "Chat started",
              timestamp: Date.now(),
              chatId: message.chatId,
              chatGroupId: message.chatGroupId,
              metadata: {
                chat_id: message.chatId,
                chat_group_id: message.chatGroupId,
                request_id: message.requestId,
                timestamp: timestampNum.toString() // Store as string representation of number
              }
            };
            
            await addMessage({
              sessionId: currentSessionId,
              message: metadataMessage,
            });
            console.log("✅ Added CHAT_METADATA event to session");
          } catch (error) {
            console.error("❌ Error adding CHAT_METADATA event:", error);
          }
        }
        
        return;
      }

      // Handle other message types
      if (timeout.current) {
        window.clearTimeout(timeout.current);
      }

      // Handle message storage
      if (message.type === "user_message" || message.type === "assistant_message") {
        console.log(`🗣️ Processing ${message.type}:`, {
          role: message.type === "user_message" ? "user" : "assistant",
          content: message.message.content,
          emotions: message.models.prosody?.scores
        });

        const messageData = {
          type: message.type === "user_message" ? "USER_MESSAGE" : 
                message.type === "assistant_message" ? "AGENT_MESSAGE" : 
                message.type.toUpperCase(),
          role: message.type === "user_message" ? "USER" as const : "ASSISTANT" as const,
          messageText: message.message.content,
          content: message.message.content,
          timestamp: Date.now(),
          emotionFeatures: message.models.prosody?.scores ? 
            typeof message.models.prosody.scores === 'string' ?
            message.models.prosody.scores :
            JSON.stringify(message.models.prosody.scores) : undefined,
          chatId: metadata?.chat_id,
          chatGroupId: metadata?.chat_group_id,
          metadata: metadata || undefined
        };

        // If no session exists, create one with the initial message
        if (!currentSessionId) {
          console.log("📝 Creating new session with initial message:", messageData);
          const initialMessage = {
            type: messageData.type as "USER_MESSAGE" | "AGENT_MESSAGE" | "SYSTEM_MESSAGE" | "CHAT_METADATA",
            role: messageData.role.toUpperCase() as "USER" | "ASSISTANT" | "SYSTEM",
            messageText: messageData.messageText,
            content: messageData.content,
            timestamp: messageData.timestamp,
            emotionFeatures: messageData.emotionFeatures ? 
              typeof messageData.emotionFeatures === 'string' ? 
              messageData.emotionFeatures : 
              JSON.stringify(messageData.emotionFeatures) : undefined,
          };
          const result = await createSession({
            initialMessage
          });
          console.log("✨ Session creation result:", result);
          if (result?.sessionId) {
            console.log("🆔 Setting current session ID:", result.sessionId);
            setCurrentSessionId(result.sessionId);
            
            // Update metadata immediately after session creation
            if (metadata) {
              try {
                console.log("💫 Updating chat metadata for new session:", result.sessionId);
                
                // Convert timestamp string to numeric timestamp
                const timestampNum = typeof metadata.timestamp === 'string' ? 
                  (metadata.timestamp.match(/^\d+$/) ? 
                    parseInt(metadata.timestamp, 10) : 
                    Date.parse(metadata.timestamp) || Date.now()) : 
                  Date.now();
                
                await updateChatMetadata({
                  sessionId: result.sessionId,
                  chatId: metadata.chat_id,
                  chatGroupId: metadata.chat_group_id,
                  requestId: metadata.request_id,
                  receivedAt: timestampNum.toString()
                });
                console.log("✅ Successfully stored chat metadata for new session");
              } catch (error) {
                console.error("❌ Error storing chat metadata:", error);
              }
            }
          }
        } else {
          // Add message to existing session
          console.log("📨 Adding message to existing session:", {
            sessionId: currentSessionId,
            messageData
          });
          await addMessage({
            sessionId: currentSessionId,
            message: messageData,
          });
          console.log("✅ Message added to session successfully");
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
    },
    [currentSessionId, createSession, addMessage, updateChatMetadata, humeChatId, humeGroupChatId, metadata, resetInactivityTimer]
  );

  useEffect(() => {
    if (!voice) return;
    
    // Listen for messages from the voice service using a custom event
    const messageListener = (event: any) => {
      console.log("🔍 Event listener triggered with event:", {
        type: event.type,
        detail: event.detail ? {
          type: event.detail.type,
          chatId: event.detail.chatId,
          chatGroupId: event.detail.chatGroupId
        } : null
      });
      
      // Direct debug logging of event fields for metadata events
      if (event.detail && event.detail.type === "chat_metadata") {
        console.log("⭐ DIRECT ACCESS event.detail fields:", {
          chatId: event.detail.chatId,
          chatGroupId: event.detail.chatGroupId,
          timestamp: new Date().toISOString()
        });
      }
      
      if (event.detail) {
        // Direct handling of chat_metadata to avoid potential timing issues
        if (event.detail.type === "chat_metadata") {
          console.log("🚨 Directly handling chat_metadata in event listener:", {
            chatId: event.detail.chatId,
            chatGroupId: event.detail.chatGroupId
          });
          
          // Ensure we have the chat IDs before setting them - add defensive coding
          if (event.detail.chatId && event.detail.chatGroupId) {
            console.log(`🔵 Setting Hume chat IDs: chatId=${event.detail.chatId}, chatGroupId=${event.detail.chatGroupId}`);
            
            // Store the chat IDs immediately
            setHumeChatId(event.detail.chatId);
            setHumeGroupChatId(event.detail.chatGroupId);
            
            // Store full metadata using our helper
            const newMetadata = {
              chat_id: event.detail.chatId,
              chat_group_id: event.detail.chatGroupId,
              request_id: event.detail.requestId || crypto.randomUUID(),
              timestamp: safeGetISOString(event.detail.receivedAt)
            };
            setMetadata(newMetadata);
            
            // Update database if we have a session
            if (currentSessionId) {
              console.log(`🔄 Direct update of metadata for session: ${currentSessionId} with IDs: ${event.detail.chatId}, ${event.detail.chatGroupId}`);
              
              // Use the new updateAndVerifyMetadata function instead
              updateAndVerifyMetadata({
                sessionId: currentSessionId,
                chatId: event.detail.chatId,
                chatGroupId: event.detail.chatGroupId,
                requestId: event.detail.requestId || crypto.randomUUID(),
                receivedAt: safeGetISOString(event.detail.receivedAt)
              }).then((result) => {
                console.log("✅ Successfully stored chat metadata (verified):", result);
              }).catch(error => {
                console.error("❌ Error storing chat metadata (updateAndVerify):", error);
                
                // Fall back to regular update if verification fails
                updateChatMetadata({
                  sessionId: currentSessionId,
                  chatId: event.detail.chatId,
                  chatGroupId: event.detail.chatGroupId,
                  requestId: event.detail.requestId || crypto.randomUUID(),
                  receivedAt: safeGetISOString(event.detail.receivedAt)
                }).then(() => {
                  console.log("✅ Successfully stored chat metadata (fallback)");
                }).catch(error => {
                  console.error("❌ Error storing chat metadata (fallback):", error);
                });
              });
            }
          } else {
            console.error("⛔ Missing chat IDs in metadata event:", event.detail);
          }
        }
        
        // Still call the regular handler for all messages
        handleMessage(event.detail);
      }
    };
    
    // Add the event listener
    window.addEventListener("hume:message", messageListener);
    
    // Clean up
    return () => {
      window.removeEventListener("hume:message", messageListener);
    };
  }, [voice, handleMessage, currentSessionId, updateChatMetadata, updateAndVerifyMetadata]);

  // Check localStorage for metadata when component mounts
  useEffect(() => {
    if (!initialSessionId) return;
    
    try {
      const storedMetadata = localStorage.getItem('hume_metadata');
      if (storedMetadata) {
        const metadata = JSON.parse(storedMetadata);
        console.log(`🎉 Found Hume metadata in localStorage:`, metadata);
        
        // Only update if we have both required IDs
        if (metadata.chatId && metadata.chatGroupId) {
          console.log(`📊 Using Hume IDs from localStorage: chatId=${metadata.chatId}, chatGroupId=${metadata.chatGroupId}`);
          
          // Update our database with this metadata
          updateAndVerifyMetadata({
            sessionId: initialSessionId,
            chatId: metadata.chatId,
            chatGroupId: metadata.chatGroupId,
            requestId: metadata.requestId || crypto.randomUUID(),
            receivedAt: new Date().toISOString()
          }).then(result => {
            console.log(`✅ Successfully updated database with localStorage metadata:`, result);
          }).catch(error => {
            console.error(`❌ Failed to update database with localStorage metadata:`, error);
          });
        }
      }
    } catch (e) {
      console.error(`Error checking localStorage for metadata:`, e);
    }
  }, [initialSessionId]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (inactivityTimeout.current) {
        clearTimeout(inactivityTimeout.current);
      }
      if (currentSessionId) {
        handleSessionEnd(currentSessionId);
      }
    };
  }, [currentSessionId, handleSessionEnd]);

  // Initialize inactivity timer
  useEffect(() => {
    resetInactivityTimer();
  }, [resetInactivityTimer]);

  if (!accessToken) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Messages ref={ref} />
      <Controls 
        sessionId={currentSessionId || undefined} 
        onEndCallStart={onEndCallStart} 
      />
      <StartCall sessionId={currentSessionId || undefined} />
      
      {/* Add the ChatSaveHandler component to save transcripts when the chat ends */}
      {currentSessionId && (
        <ChatSaveHandler 
          sessionId={currentSessionId}
          humeChatId={humeChatId}
          humeGroupChatId={humeGroupChatId}
        />
      )}
    </div>
  );
}