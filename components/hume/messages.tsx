"use client";

import { cn } from "@/lib/utils";
import { useVoice } from "@humeai/voice-react";
import { Expressions } from "./expressions";
import { AnimatePresence, motion } from "framer-motion";
import { ComponentRef, forwardRef, useRef, useCallback, useEffect, useState } from "react";
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
  const [visibleMessageCount, setVisibleMessageCount] = useState(3); // Show only the most recent N messages
  
  // Get persisted chat messages for history view
  const chat = useQuery(api.chat.getActiveConversation, { chatId: sessionId });
  const isLiveChat = !!voiceMessages.length;

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
  
  // Get only the most recent messages to display
  const recentMessages = sortedMessages.slice(-visibleMessageCount);

  // Adjust visible message count based on screen size and face tracking status
  useEffect(() => {
    // If face tracking is enabled, show fewer messages to make room for the camera
    const messageCount = isFaceTrackingEnabled ? 3 : 5;
    setVisibleMessageCount(messageCount);
  }, [isFaceTrackingEnabled]);

  return (
    <div 
      className={cn(
        "flex flex-col",
        isFaceTrackingEnabled ? "h-[65vh]" : "h-[80vh]", // Adjusted height based on face tracking status
        "relative overflow-hidden" // Prevent scrolling
      )}
      ref={ref}
    >
      {/* Welcome message when no messages */}
      {sortedMessages.length === 0 && (
        <motion.div
          className="text-center p-4 text-muted-foreground absolute inset-0 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <p>Start the conversation by saying something...</p>
        </motion.div>
      )}
      
      {/* Message container with fixed position at bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <div className="max-w-2xl mx-auto w-full space-y-3">
          <AnimatePresence mode="popLayout">
            {recentMessages.map((msg, index) => {
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
                      y: 20,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                    exit={{
                      opacity: 0,
                      y: -20,
                      transition: { duration: 0.3 }
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 500,
                      damping: 30,
                    }}
                  >
                    <div className={cn(
                      "text-xs capitalize font-medium leading-none opacity-50 pt-3 px-3"
                    )}>
                      {msg.message.role}
                    </div>
                    <div className="pb-3 px-3 text-sm">{msg.message.content}</div>
                    <Expressions values={msg.models?.prosody?.scores as Record<string, number> | undefined} />
                  </motion.div>
                );
              }
              return null;
            })}
          </AnimatePresence>
        </div>
      </div>
      
      {/* Message count indicator */}
      {sortedMessages.length > visibleMessageCount && (
        <div className="absolute top-2 left-0 right-0 flex justify-center">
          <div className="bg-muted/30 text-muted-foreground text-xs px-2 py-1 rounded-full">
            {sortedMessages.length - visibleMessageCount} earlier messages
          </div>
        </div>
      )}
    </div>
  );
});