"use client";

import { useVoice } from "@humeai/voice-react";
import { Messages } from "./messages";
import { Controls } from "./controls";
import { StartCall } from "./start-call";
import { ComponentRef, useEffect, useRef, useState } from "react";
import { api } from "@/convex/_generated/api";
import { useMutation } from "convex/react";

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

  const createSession = useMutation(api.chat.createChatSession);
  const addMessage = useMutation(api.chat.addMessageToSession);

  // Set up message handler for the existing voice connection
  useEffect(() => {
    if (!voice) return;
    
    // Handle messages from the voice service
    const handleMessage = async (message: any) => {
      if (timeout.current) {
        window.clearTimeout(timeout.current);
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
  }, [voice, currentSessionId, createSession, addMessage]);

  if (!accessToken) {
    return <div>Loading...</div>;
  }

  return (
    <div className="relative flex-1 flex flex-col mx-auto w-full overflow-hidden">
      {/* Use the components without wrapping in another VoiceProvider */}
      <Messages ref={ref} />
      <Controls />
      <StartCall />
    </div>
  );
} 