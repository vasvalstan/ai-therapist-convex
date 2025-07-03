"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useEffect, useState, useRef } from "react";

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
  const scale = 1 + Math.min(averageAmplitude * 0.5, 0.3);
  
  // Use state to smooth transitions
  const [smoothScale, setSmoothScale] = useState(1);
  const [pulseActive, setPulseActive] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const animationRef = useRef<NodeJS.Timeout | null>(null);
  
  // Smooth the scale changes
  useEffect(() => {
    if (isActive) {
      setSmoothScale(prev => {
        // Smooth transition by taking weighted average
        return prev * 0.7 + scale * 0.3;
      });
      
      // Activate pulse effect randomly to simulate conversation
      if (Math.random() > 0.7) {
        setPulseActive(true);
      } else {
        // Reduce pulse activity randomly
        setPulseActive(prev => Math.random() > 0.6 ? prev : false);
      }
    } else {
      setSmoothScale(1);
      setPulseActive(false);
    }
  }, [scale, isActive, fft]);
  
  // Add random movement effect
  useEffect(() => {
    if (!isActive) return;
    
    // Function to generate random movement
    const moveRandomly = () => {
      // Generate random movement within a small range for smaller ball
      // Further reduced movement range to keep it more centered
      const newX = (Math.random() - 0.5) * 10;
      const newY = (Math.random() - 0.5) * 10;
      
      // Apply movement with smoothing
      setPosition(prev => ({
        x: prev.x * 0.8 + newX * 0.2,
        y: prev.y * 0.8 + newY * 0.2
      }));
      
      // Schedule next movement
      animationRef.current = setTimeout(moveRandomly, 800 + Math.random() * 1200);
    };
    
    // Start random movement
    moveRandomly();
    
    // Clean up on unmount or when inactive
    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, [isActive]);
  
  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      {/* Main ball */}
      <motion.div
        className="rounded-full bg-gradient-to-br from-blue-300 via-blue-400 to-blue-300 shadow-lg shadow-blue-200/20"
        animate={{
          scale: isActive ? smoothScale : 1,
          opacity: isActive ? 1 : 0.5,
          x: position.x,
          y: position.y,
        }}
        transition={{
          duration: 0.3,
          type: "spring",
          stiffness: 100,
          damping: 10
        }}
        style={{
          width: "120px",
          height: "120px",
        }}
      />
      
      {/* Inner glow */}
      <motion.div
        className="absolute rounded-full bg-blue-300/30 blur-sm"
        animate={{
          scale: isActive ? smoothScale * 0.8 : 0.8,
          opacity: isActive ? 0.6 : 0,
          x: position.x * 0.9,
          y: position.y * 0.9,
        }}
        transition={{
          duration: 0.3,
        }}
        style={{
          width: "120px",
          height: "120px",
        }}
      />
      
      {/* Pulse effect */}
      {isActive && pulseActive && (
        <motion.div
          className="absolute rounded-full bg-blue-300/10 blur-md"
          initial={{ scale: 1, opacity: 0.7 }}
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.7, 0.3, 0.7],
            x: position.x * 0.95,
            y: position.y * 0.95,
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            repeatType: "loop",
          }}
          style={{
            width: "120px",
            height: "120px",
          }}
        />
      )}
      
      {/* Ripple effects */}
      {isActive && (
        <>
          <motion.div
            className="absolute rounded-full border-2 border-blue-300/30"
            initial={{ width: "120px", height: "120px", opacity: 0.7 }}
            animate={{ 
              width: "150px", 
              height: "150px", 
              opacity: 0,
              x: position.x * 0.8,
              y: position.y * 0.8,
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              repeatDelay: 0.2,
            }}
          />
          <motion.div
            className="absolute rounded-full border-2 border-blue-300/20"
            initial={{ width: "120px", height: "120px", opacity: 0.5 }}
            animate={{ 
              width: "180px", 
              height: "180px", 
              opacity: 0,
              x: position.x * 0.7,
              y: position.y * 0.7,
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