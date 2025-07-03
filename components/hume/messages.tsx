"use client";

import { cn } from "@/lib/utils";
import { useVoice } from "@humeai/voice-react";
import { AnimatePresence, motion } from "framer-motion";
import { ComponentRef, forwardRef, useRef, useCallback, useEffect, useState } from "react";
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
  HTMLDivElement,
  Record<never, never>
>(function Messages(_, ref) {
  const { messages: voiceMessages } = useVoice();
  const params = useParams();
  const sessionId = params?.sessionId as string;
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  // Set visible message count based on screen size
  useEffect(() => {
    // Show more messages since we have more space with smaller audio bubble
    const messageCount = 7;
    setVisibleMessageCount(messageCount);
  }, []);

  return (
    <div 
      className={cn(
        "flex flex-col",
        "h-[85vh] sm:h-[87vh] md:h-[88vh]", // More space for conversation
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
      
      {/* Message count indicator - invisible but kept for spacing */}
      {sortedMessages.length > visibleMessageCount && (
        <div className="absolute top-0 left-0 right-0 flex justify-center">
          <div className="bg-transparent text-transparent text-xs px-2 py-1 rounded-full select-none" aria-hidden="true">
            {sortedMessages.length - visibleMessageCount} earlier messages
          </div>
        </div>
      )}
      
      {/* Message container positioned with top alignment instead of center */}
      <div className="absolute inset-0 flex flex-col items-center pt-6">
        <div className="max-w-2xl w-full space-y-3">
          <AnimatePresence mode="popLayout">
            {recentMessages.map((msg, index) => {
              if (
                msg.type === "user_message" ||
                msg.type === "assistant_message"
              ) {
                const isUserMessage = msg.type === "user_message";
                
                return (
                  <motion.div
                    key={msg.type + index}
                    className={cn(
                      "w-[80%]", // Width for all messages
                      isUserMessage ? "mr-auto" : "ml-auto", // Position user messages left, assistant messages right
                      "bg-card",
                      "border border-border rounded"
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
                    <div className="py-3 px-3 text-sm">{msg.message.content}</div>
                  </motion.div>
                );
              }
              return null;
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
});