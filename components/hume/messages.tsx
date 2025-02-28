"use client";

import { useVoice } from "@humeai/voice-react";
import { motion } from "framer-motion";
import { ComponentRef, forwardRef, useEffect, useState, useRef } from "react";
import { AudioVisualizerBall } from "./audio-visualizer-ball";
import { FadingText } from "./fading-text";

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
          
          // Add to processed messages immediately after fade-out
          setProcessedMessageIndices(prev => [...prev, lastMsgIndex]);
          
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