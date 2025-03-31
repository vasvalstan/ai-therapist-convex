"use client";

import { cn } from "@/lib/utils";
import { useVoice } from "@humeai/voice-react";
import { Expressions } from "./expressions";
import { AnimatePresence, motion } from "framer-motion";
import { ComponentRef, forwardRef } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams } from "next/navigation";

interface EmotionScores {
  [key: string]: number;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp?: number;
  emotions?: Record<string, number>;
}

interface ChatMessage {
  type: "user_message" | "assistant_message";
  message: {
    role: "user" | "assistant";
    content: string;
  };
  models: {
    prosody: {
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
  const persistedMessages = (chat?.messages || []) as Message[];

  // Combine and sort all messages by timestamp
  const allMessages = [
    ...persistedMessages.map(msg => ({
      type: msg.role === "user" ? "user_message" as const : "assistant_message" as const,
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
    })),
    ...voiceMessages.filter(msg => 
      msg.type === "user_message" || 
      msg.type === "assistant_message"
    )
  ].sort((a, b) => {
    // For persisted messages
    if ("timestamp" in a && "timestamp" in b) {
      return (a.timestamp || 0) - (b.timestamp || 0);
    }
    // For voice messages without timestamp, add them at the end
    if (!("timestamp" in a)) return 1;
    if (!("timestamp" in b)) return -1;
    return 0;
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
                  <Expressions values={msg.models.prosody?.scores as Record<string, number> | undefined} />
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