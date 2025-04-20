"use client";

import { useState, useEffect, useRef } from "react";
import { FaceWidgets } from "./FaceWidgets";
import { AudioVisualizerBall } from "./audio-visualizer-ball";
import { useHume } from "./HumeProvider";

interface AudioVideoContainerProps {
  apiKey: string;
  compact?: boolean;
}

export function AudioVideoContainer({ apiKey, compact = false }: AudioVideoContainerProps) {
  const { isFaceTrackingEnabled } = useHume();
  const [fftData, setFftData] = useState<number[]>(Array(128).fill(0));
  const [isAudioActive, setIsAudioActive] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  // Initialize audio processing for visualization
  useEffect(() => {
    // Only initialize audio context if face tracking is disabled
    if (isFaceTrackingEnabled) {
      // Clean up audio processing if face tracking is enabled
      if (audioContextRef.current) {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
        
        // Don't actually close the AudioContext as it might be needed again
        // when switching back to audio-only mode
        setIsAudioActive(false);
      }
      return;
    }
    
    // Initialize audio context and analyzer for visualization
    const initAudio = async () => {
      try {
        // Create audio context if it doesn't exist
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
          analyserRef.current = audioContextRef.current.createAnalyser();
          analyserRef.current.fftSize = 256;
        }
        
        // Get user microphone access
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Ensure audio context and analyzer exist before connecting
        if (audioContextRef.current && analyserRef.current) {
          const source = audioContextRef.current.createMediaStreamSource(stream);
          source.connect(analyserRef.current);
          
          // Start audio visualization
          setIsAudioActive(true);
          updateFFT();
          
          return () => {
            if (animationFrameRef.current) {
              cancelAnimationFrame(animationFrameRef.current);
            }
            
            // Disconnect and clean up
            source.disconnect();
            stream.getTracks().forEach(track => track.stop());
          };
        }
      } catch (error) {
        console.error("Error initializing audio:", error);
        setIsAudioActive(false);
      }
    };
    
    initAudio();
    
    // Clean up on unmount
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isFaceTrackingEnabled]);
  
  // Update FFT data for visualization
  const updateFFT = () => {
    if (!analyserRef.current) return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    // Normalize data to range 0-1 for the visualizer
    const normalizedData = Array.from(dataArray).map(value => value / 255);
    setFftData(normalizedData);
    
    // Continue updating
    animationFrameRef.current = requestAnimationFrame(updateFFT);
  };
  
  return (
    <div className="w-full h-56 relative">
      {/* Face tracking video when enabled */}
      {isFaceTrackingEnabled ? (
        <div className="absolute inset-0">
          <FaceWidgets apiKey={apiKey} compact={compact} />
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <AudioVisualizerBall 
            fft={fftData} 
            isActive={isAudioActive} 
            className="w-full h-full"
          />
        </div>
      )}
    </div>
  );
}
