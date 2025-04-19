"use client";

import { cn } from "@/lib/utils";
import { useVoice } from "@humeai/voice-react";
import { Expressions } from "./expressions";
import { AnimatePresence, motion } from "framer-motion";
import { ComponentRef, forwardRef, useRef, useCallback, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams } from "next/navigation";
import { useHume } from "./HumeProvider";

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
  HTMLDivElement,
  Record<never, never>
>(function Messages(_, ref) {
  const { messages: voiceMessages } = useVoice();
  const params = useParams();
  const sessionId = params?.sessionId as string;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { isFaceTrackingEnabled } = useHume();
  
  // Get persisted chat messages for history view
  const chat = useQuery(api.chat.getActiveConversation, { chatId: sessionId });
  const isLiveChat = !!voiceMessages.length;

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [voiceMessages.length, chat?.messages?.length, scrollToBottom]);
  
  // Use voice messages for live chat, database messages for history
  const allMessages = isLiveChat ? 
    // Live chat - use voice messages
    voiceMessages
      .filter(msg => msg.type === "user_message" || msg.type === "assistant_message")
      .map(msg => ({
        type: msg.type,
        message: {
          role: msg.type === "user_message" ? "user" : "assistant",
          content: msg.message?.content || ''
        },
        models: msg.models?.prosody?.scores ? {
          prosody: {
            scores: msg.models.prosody.scores as unknown as Record<string, number>
          }
        } : undefined,
        timestamp: Date.now()
      })) :
    // History view - use database messages
    (chat?.messages || [])
      .filter(msg => msg.role !== "SYSTEM")
      .map(msg => ({
        type: msg.role.toLowerCase() === "user" ? "user_message" : "assistant_message",
        message: {
          role: msg.role.toLowerCase() as "user" | "assistant",
          content: msg.content || msg.messageText || ''
        },
        models: msg.emotionFeatures ? {
          prosody: {
            scores: typeof msg.emotionFeatures === 'string' ? 
              JSON.parse(msg.emotionFeatures) : 
              msg.emotionFeatures
          }
        } : undefined,
        timestamp: msg.timestamp
      }));

  // Sort messages by timestamp
  const sortedMessages = [...allMessages].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

  return (
    <motion.div
      layoutScroll
      className={cn(
        "grow rounded-md overflow-auto p-4 scroll-smooth",
        isFaceTrackingEnabled && "pt-2" // Less top padding when face tracking is enabled
      )}
      ref={ref}
    >
      <motion.div className="max-w-2xl mx-auto w-full flex flex-col gap-4">
        {/* Welcome message when no messages */}
        {sortedMessages.length === 0 && (
          <motion.div
            className="text-center p-4 text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <p>Start the conversation by saying something...</p>
          </motion.div>
        )}
        
        <AnimatePresence mode="popLayout">
          {sortedMessages.map((msg, index) => {
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
        <div ref={messagesEndRef} />
      </motion.div>
    </motion.div>
  );
});