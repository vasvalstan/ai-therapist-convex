"use client";

import { cn } from "@/lib/utils";
import { useVoice } from "@humeai/voice-react";
import { Expressions } from "./expressions";
import { AnimatePresence, motion } from "framer-motion";
import { ComponentRef, forwardRef, useEffect, useState, useRef } from "react";
import { AudioVisualizerBall } from "./audio-visualizer-ball";
import { FadingText } from "./fading-text";
import { History } from "lucide-react";
import { Button } from "../ui/button";

export const Messages = forwardRef<
  ComponentRef<typeof motion.div>,
  Record<never, never>
>(function Messages(_, ref) {
  const { messages, micFft, status } = useVoice();
  const [currentMessage, setCurrentMessage] = useState<{
    content: string;
    role: "user" | "assistant";
    isActive: boolean;
    index: number;
  } | null>(null);
  
  // Track which messages have been processed and should be shown in history
  const [processedMessageIndices, setProcessedMessageIndices] = useState<number[]>([]);
  
  // State to control chat history visibility
  const [showHistory, setShowHistory] = useState(false);
  
  // Ref to track active timers
  const fadeTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // State to track if audio visualizer should be active
  const [visualizerActive, setVisualizerActive] = useState(false);

  // Update current message when messages change
  useEffect(() => {
    if (messages.length > 0) {
      const lastMsgIndex = messages.length - 1;
      const lastMsg = messages[lastMsgIndex];
      
      // Check if this is a new message we haven't processed yet
      if (!processedMessageIndices.includes(lastMsgIndex) &&
          (lastMsg.type === "user_message" || lastMsg.type === "assistant_message")) {
        
        // Set visualizer active for both user and assistant messages
        setVisualizerActive(true);
        
        // Set as current active message
        setCurrentMessage({
          content: lastMsg.message.content || "",
          role: lastMsg.type === "user_message" ? "user" : "assistant",
          isActive: true,
          index: lastMsgIndex
        });
        
        // Hide history when new message comes in
        setShowHistory(false);
        
        // Clear any existing timers
        if (fadeTimerRef.current) {
          clearTimeout(fadeTimerRef.current);
          fadeTimerRef.current = null;
        }
        
        // After the fade-out animation, add to processed messages
        // For longer messages, we'll keep the text visible longer
        const textLength = (lastMsg.message.content || "").length;
        const baseDuration = 2000; // Base duration for short messages
        const durationPerChar = 50; // Additional ms per character
        const maxDuration = 8000; // Cap at 8 seconds for very long messages
        
        const displayDuration = Math.min(
          baseDuration + textLength * durationPerChar,
          maxDuration
        );
        
        fadeTimerRef.current = setTimeout(() => {
          setCurrentMessage(prev => 
            prev ? { ...prev, isActive: false } : null
          );
          
          // Deactivate visualizer after message fades
          setTimeout(() => {
            setVisualizerActive(false);
          }, 300);
          
          // Add a delay before showing in chat history
          setTimeout(() => {
            setProcessedMessageIndices(prev => [...prev, lastMsgIndex]);
          }, 300); // Small delay after fade-out
          
          fadeTimerRef.current = null;
        }, displayDuration);
        
        return () => {
          if (fadeTimerRef.current) {
            clearTimeout(fadeTimerRef.current);
          }
        };
      }
    }
  }, [messages, processedMessageIndices]);
  
  // Listen for microphone activity to activate visualizer for user input
  useEffect(() => {
    if (micFft && micFft.length > 0) {
      const averageAmplitude = micFft.reduce((sum, val) => sum + val, 0) / micFft.length;
      
      // If there's significant microphone activity and no current message
      if (averageAmplitude > 0.05 && !currentMessage?.isActive) {
        setVisualizerActive(true);
      }
    }
  }, [micFft, currentMessage]);

  return (
    <motion.div
      layoutScroll
      className="grow rounded-md overflow-auto p-4 flex flex-col"
      ref={ref}
    >
      {/* Toggle history button */}
      {status.value === "connected" && messages.length > 0 && (
        <div className="fixed top-4 right-4 z-50">
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
            onClick={() => setShowHistory(!showHistory)}
          >
            <History className="w-4 h-4" />
            {showHistory ? "Hide History" : "Show History"}
          </Button>
        </div>
      )}
      
      {/* Chat history */}
      <AnimatePresence>
        {showHistory && (
          <motion.div 
            className="max-w-2xl mx-auto w-full flex flex-col gap-4 pb-24 flex-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <AnimatePresence mode="popLayout">
              {messages.map((msg, index) => {
                // Only show messages that have been processed (after visualizer display)
                if (!processedMessageIndices.includes(index)) {
                  return null;
                }
                
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
                      <Expressions values={msg.models.prosody?.scores} />
                    </motion.div>
                  );
                }
                return null;
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Audio visualizer and fading text overlay */}
      {status.value === "connected" && (
        <div className="fixed inset-0 pointer-events-none flex flex-col items-center justify-center">
          <div className="flex flex-col items-center" style={{ height: "200px" }}>
            {/* Fixed position container for visualizer */}
            <div className="h-[100px] flex items-center justify-center">
              <AudioVisualizerBall 
                fft={micFft} 
                isActive={status.value === "connected" && (!!currentMessage?.isActive || visualizerActive)} 
              />
            </div>
            
            {/* Fixed position container for text */}
            <div className="h-[100px] flex items-center justify-center">
              <FadingText 
                text={currentMessage?.content || ""} 
                isVisible={!!currentMessage?.isActive} 
                role={currentMessage?.role || "assistant"}
                className="text-center max-w-xl"
                duration={4000} // Longer base duration
              />
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}); 