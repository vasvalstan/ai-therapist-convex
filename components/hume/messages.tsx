"use client";

import { cn } from "@/lib/utils";
import { useVoice } from "@humeai/voice-react";
import { Expressions } from "./expressions";
import { AnimatePresence, motion } from "framer-motion";
import { ComponentRef, forwardRef } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams } from "next/navigation";

interface DatabaseMessage {
  role: "USER" | "ASSISTANT" | "SYSTEM";
  content: string;
  timestamp: number;
  emotions?: Record<string, number>;
  metadata?: {
    chat_id: string;
    chat_group_id: string;
    request_id: string;
    timestamp: string;
  };
}

interface PersistedMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  emotions?: Record<string, number>;
  metadata?: {
    chat_id: string;
    chat_group_id: string;
    request_id: string;
    timestamp: string;
  };
}

interface MessageWithTimestamp {
  type: "user_message" | "assistant_message";
  message: {
    role: "user" | "assistant";
    content: string;
  };
  models?: {
    prosody?: {
      scores?: Record<string, number>;
    };
  };
  timestamp?: number;
}

export const Messages = forwardRef<
  ComponentRef<typeof motion.div>,
  Record<never, never>
>(function Messages(_, ref) {
  const { messages: voiceMessages } = useVoice();
  const params = useParams();
  const sessionId = params?.sessionId as string;
  
  // Get persisted chat messages
  const chat = useQuery(api.chat.getActiveConversation, { chatId: sessionId });
  const dbMessages = (chat?.messages || []) as DatabaseMessage[];
  
  // Normalize database messages to our internal format
  const persistedMessages: PersistedMessage[] = (dbMessages as DatabaseMessage[])
    .filter(msg => msg.role !== "SYSTEM") // Filter out system messages
    .map(msg => ({
      ...msg,
      role: msg.role.toLowerCase() as "user" | "assistant"
    }));

  // Create a map to deduplicate messages
  const messageMap = new Map<string, MessageWithTimestamp>();

  // First add persisted messages to the map
  persistedMessages.forEach(msg => {
    const key = `${msg.timestamp}-${msg.content}`;
    messageMap.set(key, {
      type: msg.role === "user" ? "user_message" : "assistant_message",
      message: {
        role: msg.role,
        content: msg.content
      },
      models: {
        prosody: {
          scores: msg.emotions
        }
      },
      timestamp: msg.timestamp
    });
  });

  // Then add voice messages, only if they don't exist
  voiceMessages
    .filter(msg => msg.type === "user_message" || msg.type === "assistant_message")
    .forEach(msg => {
      const timestamp = Date.now(); // Voice messages might not have timestamps
      const content = msg.message?.content || '';
      const key = `${timestamp}-${content}`;
      if (!messageMap.has(key)) {
        messageMap.set(key, {
          type: msg.type,
          message: msg.message,
          models: msg.models,
          timestamp
        } as MessageWithTimestamp);
      }
    });

  // Convert map back to array and sort by timestamp
  const allMessages = Array.from(messageMap.values()).sort((a, b) => {
    const aTime = a.timestamp || 0;
    const bTime = b.timestamp || 0;
    return aTime - bTime;
  });

  return (
    <motion.div
      layoutScroll
      className="grow rounded-md overflow-auto p-4"
      ref={ref}
    >
      <motion.div className="max-w-2xl mx-auto w-full flex flex-col gap-4 pb-24">
        <AnimatePresence mode="popLayout">
          {allMessages.map((msg, index) => {
            if (
              msg.type === "user_message" ||
              msg.type === "assistant_message"
            ) {
              return (
                <motion.div
                  key={msg.type + index}
                  className={cn(
                    "w-[80%]",
                    "bg-card",
                    "border border-border rounded",
                    msg.type === "user_message" ? "ml-auto" : ""
                  )}
                  initial={{
                    opacity: 0,
                    y: 10,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  exit={{
                    opacity: 0,
                    y: 0,
                  }}
                >
                  <div className={cn(
                    "text-xs capitalize font-medium leading-none opacity-50 pt-4 px-3"
                  )}>
                    {msg.message.role}
                  </div>
                  <div className="pb-3 px-3">{msg.message.content}</div>
                  <Expressions values={msg.models?.prosody?.scores as Record<string, number> | undefined} />
                </motion.div>
              );
            }
            return null;
          })}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}); 