"use client";

import { useVoice } from "@humeai/voice-react";
import { Messages } from "./messages";
import { Controls } from "./controls";
import { StartCall } from "./start-call";
import { ComponentRef, useEffect, useRef, useState } from "react";
import { api } from "@/convex/_generated/api";
import { useMutation } from "convex/react";
import { ChatSaveHandler } from "./voice-controller";

interface HumeChatProps {
  accessToken: string;
  sessionId?: string;
}

type MessageRole = "user" | "assistant";

export default function HumeChat({ accessToken, sessionId: initialSessionId }: HumeChatProps) {
  const timeout = useRef<number | null>(null);
  const ref = useRef<ComponentRef<typeof Messages> | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(initialSessionId ?? null);
  const voice = useVoice(); // Use the existing voice connection
  
  // Track Hume chat IDs
  const [humeChatId, setHumeChatId] = useState<string | undefined>();
  const [humeGroupChatId, setHumeGroupChatId] = useState<string | undefined>();

  const createSession = useMutation(api.chat.createChatSession);
  const addMessage = useMutation(api.chat.addMessageToSession);
  const updateHumeChatIds = useMutation(api.chat.updateHumeChatIds);

  // Set up message handler for the existing voice connection
  useEffect(() => {
    if (!voice) return;
    
    // Handle messages from the voice service
    const handleMessage = async (message: any) => {
      if (timeout.current) {
        window.clearTimeout(timeout.current);
      }

      // Check for chat metadata to get the chat ID and group ID
      if (message.type === "chat_metadata") {
        const chatId = message.chat_id;
        const chatGroupId = message.chat_group_id;
        
        // Set the chat IDs for later use
        setHumeChatId(chatId);
        setHumeGroupChatId(chatGroupId);
        
        // Store the Hume chat IDs in the database if we have a session
        if (currentSessionId && chatId && chatGroupId) {
          try {
            await updateHumeChatIds({
              chatId: currentSessionId,
              humeChatId: chatId,
              humeGroupChatId: chatGroupId
            });
          } catch (error) {
            console.error("Error storing Hume chat IDs:", error);
          }
        }
      }

      // Handle message storage
      if (message.type === "user_message" || message.type === "assistant_message") {
        const messageData = {
          role: (message.type === "user_message" ? "user" : "assistant") as MessageRole,
          content: message.message.content,
          emotions: message.models.prosody?.scores,
        };

        // If no session exists, create one with the initial message
        if (!currentSessionId) {
          const result = await createSession({
            initialMessage: messageData
          });
          if (result?.sessionId) {
            setCurrentSessionId(result.sessionId);
          }
        } else {
          // Add message to existing session - include both sessionId and chatId for compatibility
          await addMessage({
            sessionId: currentSessionId,
            chatId: currentSessionId,
            message: messageData,
          });
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

    // Listen for messages from the voice service using a custom event
    const messageListener = (event: any) => {
      if (event.detail && (event.detail.type === "user_message" || event.detail.type === "assistant_message")) {
        handleMessage(event.detail);
      }
    };
    
    // Add the event listener
    window.addEventListener("hume:message", messageListener);
    
    // Clean up
    return () => {
      window.removeEventListener("hume:message", messageListener);
    };
  }, [voice, currentSessionId, createSession, addMessage, updateHumeChatIds]);

  if (!accessToken) {
    return <div>Loading...</div>;
  }

  return (
    <div className="relative flex-1 flex flex-col mx-auto w-full overflow-hidden">
      {/* Use the components without wrapping in another VoiceProvider */}
      <Messages ref={ref} />
      <Controls sessionId={currentSessionId || undefined} />
      <StartCall />
      
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