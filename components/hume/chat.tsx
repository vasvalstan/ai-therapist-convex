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

type MessageRole = "USER" | "ASSISTANT";

interface Message {
  type: string;
  role: MessageRole;
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
  const updateHumeChatIds = useMutation(api.chat.updateHumeChatIds);

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
      if (message.type === "CHAT_METADATA") {
        console.log("📋 Received chat_metadata event:", {
          chat_id: message.chat_id,
          chat_group_id: message.chat_group_id,
          request_id: message.request_id,
          timestamp: new Date().toISOString()
        });
        
        // Store the chat IDs for later use
        setHumeChatId(message.chat_id);
        setHumeGroupChatId(message.chat_group_id);
        
        // Store metadata in state for debugging
        const newMetadata = {
          chat_id: message.chat_id,
          chat_group_id: message.chat_group_id,
          request_id: message.request_id,
          timestamp: new Date().toISOString()
        };
        setMetadata(newMetadata);
        console.log("💾 Stored metadata in state:", newMetadata);

        // If we have a session, store the Hume chat IDs in our database
        if (currentSessionId) {
          try {
            console.log("💫 Updating Hume chat IDs in database for session:", currentSessionId);
            await updateHumeChatIds({
              sessionId: currentSessionId,
              humeChatId: message.chat_id,
              humeGroupChatId: message.chat_group_id,
              metadata: JSON.stringify(newMetadata)
            });
            console.log("✅ Successfully stored Hume chat IDs and metadata in database");
          } catch (error) {
            console.error("❌ Error storing Hume chat IDs and metadata:", error);
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
          role: message.type === "user_message" ? "USER" : "ASSISTANT",
          content: message.message.content,
          emotions: message.models.prosody?.scores
        });

        const messageData = {
          type: message.type.toUpperCase(),
          role: message.type === "user_message" ? "USER" : "ASSISTANT",
          content: message.message.content,
          timestamp: Date.now(),
          emotionFeatures: message.models.prosody?.scores,
          chatId: humeChatId || currentSessionId,
          chatGroupId: humeGroupChatId || currentSessionId
        };

        // If no session exists, create one with the initial message
        if (!currentSessionId) {
          console.log("📝 Creating new session with initial message:", messageData);
          const result = await createSession({
            initialMessage: messageData
          });
          console.log("✨ Session creation result:", result);
          if (result?.sessionId) {
            console.log("🆔 Setting current session ID:", result.sessionId);
            setCurrentSessionId(result.sessionId);
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
    [currentSessionId, createSession, addMessage, updateHumeChatIds, humeChatId, humeGroupChatId]
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