"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface AudioVisualizerBallProps {
  fft: number[];
  isActive: boolean;
  className?: string;
}

export function AudioVisualizerBall({ fft, isActive, className }: AudioVisualizerBallProps) {
  // Calculate average amplitude from FFT data for ball size
  const averageAmplitude = fft.length > 0 
    ? fft.reduce((sum, val) => sum + val, 0) / fft.length 
    : 0;
  
  // Scale factor for visualization with more dynamic range
  const scale = 1 + Math.min(averageAmplitude * 0.8, 0.6);
  
  // Use state to smooth transitions
  const [smoothScale, setSmoothScale] = useState(1);
  const [pulseActive, setPulseActive] = useState(false);
  
  // Smooth the scale changes
  useEffect(() => {
    if (isActive) {
      setSmoothScale(prev => {
        // Smooth transition by taking weighted average
        return prev * 0.7 + scale * 0.3;
      });
      
      // Activate pulse effect when there's significant audio activity
      if (averageAmplitude > 0.1) {
        setPulseActive(true);
      } else {
        // Reduce pulse activity when audio is quieter
        setPulseActive(prev => Math.random() > 0.7 ? prev : false);
      }
    } else {
      setSmoothScale(1);
      setPulseActive(false);
    }
  }, [scale, isActive, fft, averageAmplitude]);
  
  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      {/* Main ball */}
      <motion.div
        className="rounded-full bg-gradient-to-br from-primary via-primary/90 to-primary/70 shadow-lg shadow-primary/20"
        animate={{
          scale: isActive ? smoothScale : 1,
          opacity: isActive ? 1 : 0.5,
        }}
        transition={{
          duration: 0.2,
        }}
        style={{
          width: "70px",
          height: "70px",
        }}
      />
      
      {/* Inner glow */}
      <motion.div
        className="absolute rounded-full bg-primary/30 blur-sm"
        animate={{
          scale: isActive ? smoothScale * 0.8 : 0.8,
          opacity: isActive ? 0.6 : 0,
        }}
        transition={{
          duration: 0.2,
        }}
        style={{
          width: "70px",
          height: "70px",
        }}
      />
      
      {/* Pulse effect */}
      {isActive && pulseActive && (
        <motion.div
          className="absolute rounded-full bg-primary/10 blur-md"
          initial={{ scale: 1, opacity: 0.7 }}
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.7, 0.3, 0.7],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            repeatType: "loop",
          }}
          style={{
            width: "70px",
            height: "70px",
          }}
        />
      )}
      
      {/* Ripple effects */}
      {isActive && (
        <>
          <motion.div
            className="absolute rounded-full border-2 border-primary/30"
            initial={{ width: "70px", height: "70px", opacity: 0.7 }}
            animate={{ 
              width: "100px", 
              height: "100px", 
              opacity: 0,
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              repeatDelay: 0.2,
            }}
          />
          <motion.div
            className="absolute rounded-full border-2 border-primary/20"
            initial={{ width: "70px", height: "70px", opacity: 0.5 }}
            animate={{ 
              width: "130px", 
              height: "130px", 
              opacity: 0,
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              repeatDelay: 0.1,
            }}
          />
        </>
      )}
    </div>
  );
} 