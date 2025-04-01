"use client";

import { useVoice } from "@humeai/voice-react";
import { Messages } from "./messages";
import { Controls } from "./controls";
import { StartCall } from "./start-call";
import { ComponentRef, useEffect, useRef, useState, useCallback } from "react";
import { api } from "@/convex/_generated/api";
import { useMutation } from "convex/react";
import { ChatSaveHandler } from "./voice-controller";

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

export default function HumeChat({ 
  accessToken, 
  sessionId: initialSessionId, 
  onEndCallStart 
}: HumeChatProps) {
  const timeout = useRef<number | null>(null);
  const ref = useRef<ComponentRef<typeof Messages> | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>(initialSessionId);
  const voice = useVoice(); // Use the existing voice connection
  
  // Track Hume chat IDs
  const [humeChatId, setHumeChatId] = useState<string | undefined>();
  const [humeGroupChatId, setHumeGroupChatId] = useState<string | undefined>();
  const [metadata, setMetadata] = useState<{ chat_id: string; chat_group_id: string; request_id: string; timestamp: string } | null>(null);

  const createSession = useMutation(api.chat.createChatSession);
  const addMessage = useMutation(api.chat.addMessageToSession);
  const updateChatMetadata = useMutation(api.chat.updateChatMetadata);

  // Set up message handler for the existing voice connection
  const handleMessage = useCallback(
    async (message: any) => {
      console.log("🎯 Chat component received message:", {
        type: message.type,
        role: message.message?.role,
        content: message.message?.content,
        metadata: message.metadata,
        models: message.models
      });

      // Handle chat_metadata event which is sent at the start of every chat session
      if (message.type === "chat_metadata") {
        console.log("📋 Received chat_metadata event:", {
          chatId: message.chatId,
          chatGroupId: message.chatGroupId,
          requestId: message.requestId,
          receivedAt: message.receivedAt
        });
        
        // Store the chat IDs for later use
        setHumeChatId(message.chatId);
        setHumeGroupChatId(message.chatGroupId);
        
        // Store metadata in state for debugging
        const newMetadata = {
          chat_id: message.chatId,
          chat_group_id: message.chatGroupId,
          request_id: message.requestId,
          timestamp: message.receivedAt
        };
        setMetadata(newMetadata);
        console.log("💾 Stored metadata in state:", newMetadata);

        // If we have a session, store the Hume chat IDs in our database
        if (currentSessionId) {
          try {
            console.log("💫 Updating chat metadata in database for session:", currentSessionId);
            await updateChatMetadata({
              sessionId: currentSessionId,
              chatId: message.chatId,
              chatGroupId: message.chatGroupId,
              requestId: message.requestId,
              receivedAt: message.receivedAt
            });
            console.log("✅ Successfully stored chat metadata in database");
          } catch (error) {
            console.error("❌ Error storing chat metadata:", error);
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

        const messageData: MessageData = {
          type: message.type.toUpperCase(),
          role: message.type === "user_message" ? "user" : "assistant",
          messageText: message.message.content,
          content: message.message.content,
          timestamp: Date.now(),
          emotionFeatures: message.models.prosody?.scores,
          chatId: metadata?.chat_id,
          chatGroupId: metadata?.chat_group_id,
          metadata: metadata || undefined
        };

        // If no session exists, create one with the initial message
        if (!currentSessionId) {
          console.log("📝 Creating new session with initial message:", messageData);
          const initialMessage: InitialMessage = {
            role: messageData.role,
            content: messageData.content,
            metadata: metadata || undefined
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
                await updateChatMetadata({
                  sessionId: result.sessionId,
                  chatId: metadata.chat_id,
                  chatGroupId: metadata.chat_group_id,
                  requestId: metadata.request_id,
                  receivedAt: metadata.timestamp
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
    [currentSessionId, createSession, addMessage, updateChatMetadata, humeChatId, humeGroupChatId, metadata]
  );

  useEffect(() => {
    if (!voice) return;
    
    // Listen for messages from the voice service using a custom event
    const messageListener = (event: any) => {
      if (event.detail) {
        handleMessage(event.detail);
      }
    };
    
    // Add the event listener
    window.addEventListener("hume:message", messageListener);
    
    // Clean up
    return () => {
      window.removeEventListener("hume:message", messageListener);
    };
  }, [voice, handleMessage]);

  if (!accessToken) {
    return <div>Loading...</div>;
  }

  return (
    <div className="relative flex-1 flex flex-col mx-auto w-full overflow-hidden">
      {/* Use the components without wrapping in another VoiceProvider */}
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