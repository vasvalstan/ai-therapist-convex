"use client";

import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

interface FadingTextProps {
  text: string;
  isVisible: boolean;
  role: "user" | "assistant";
  className?: string;
  duration?: number;
}

export function FadingText({ 
  text, 
  isVisible, 
  role, 
  className,
  duration = 4000 
}: FadingTextProps) {
  const [shouldShow, setShouldShow] = useState(false);
  const [displayText, setDisplayText] = useState("");
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Control visibility with a delay
  useEffect(() => {
    if (isVisible && text) {
      setIsAnimating(true);
      setShouldShow(true);
      setDisplayText(text);
      
      // Auto-hide after duration
      const timer = setTimeout(() => {
        setShouldShow(false);
        
        // Reset animation state after exit animation completes
        setTimeout(() => {
          setIsAnimating(false);
        }, 500);
      }, duration);
      
      return () => clearTimeout(timer);
    } else if (!isVisible && !isAnimating) {
      // Keep text visible during fade-out animation
      const timer = setTimeout(() => {
        if (!isVisible) {
          setDisplayText("");
        }
      }, 500); // Match exit animation duration
      
      setShouldShow(false);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, text, isAnimating]);
  
  return (
    <div className="relative min-h-[80px] flex items-center justify-center">
      <AnimatePresence mode="wait">
        {shouldShow && (
          <motion.div
            className={cn(
              "max-w-md px-6 py-3 rounded-xl text-base backdrop-blur-sm",
              role === "user" 
                ? "bg-primary/20 text-primary-foreground border border-primary/30" 
                : "bg-secondary/30 text-secondary-foreground border border-secondary/30",
              className
            )}
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ 
              type: "spring",
              stiffness: 100,
              damping: 15,
              duration: 0.5,
            }}
          >
            {displayText}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 