"use client";

import { useState, useEffect, useRef } from "react";
import { AudioVisualizerBall } from "./audio-visualizer-ball";

interface AudioVideoContainerProps {
  apiKey: string;
  compact?: boolean;
}

export function AudioVideoContainer({ apiKey, compact = false }: AudioVideoContainerProps) {
  const [fftData, setFftData] = useState<number[]>(Array(128).fill(0));
  const [isAudioActive, setIsAudioActive] = useState(false);
  const lastUpdateRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const isMountedRef = useRef(true);
  
  useEffect(() => {
    let animationFrameId: number | null = null;
    isMountedRef.current = true;
    
    const initializeAudio = async () => {
      try {
        // Create audio context
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
        
        // Store the audio context globally for cleanup
        if (!window.activeAudioContext) {
          window.activeAudioContext = audioContextRef.current;
          console.log("AudioVideoContainer: Stored audio context for global cleanup");
        }
        
        // Get audio stream
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioStreamRef.current = stream;
        
        // Store the stream globally for cleanup
        if (!window.activeMediaStreams) {
          window.activeMediaStreams = [];
        }
        if (!window.activeMediaStreams.includes(stream)) {
          window.activeMediaStreams.push(stream);
          console.log("AudioVideoContainer: Stored audio stream for global cleanup");
        }
        
        // Connect audio nodes
        mediaStreamSourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
        mediaStreamSourceRef.current.connect(analyserRef.current);
        
        // Set up animation loop for audio visualization
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        const updateAudioVisualization = () => {
          // Check if component is still mounted
          if (!isMountedRef.current) {
            console.log("AudioVideoContainer: Component unmounted, stopping visualization");
            return;
          }
          
          if (!analyserRef.current || !audioContextRef.current) return;
          
          // Check if audio context is still active
          if (audioContextRef.current.state === 'closed') {
            console.log("AudioVideoContainer: Audio context closed, stopping visualization");
            return;
          }
          
          analyserRef.current.getByteFrequencyData(dataArray);
          
          // Calculate average frequency
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
          }
          const average = sum / bufferLength;
          
          // Throttle updates to prevent excessive re-renders (max 10 FPS for state updates)
          const now = Date.now();
          const shouldUpdate = now - lastUpdateRef.current > 100; // 100ms = 10 FPS
          
          if (shouldUpdate) {
            const newFftData = Array.from(dataArray).map(value => value / 255);
            const hasSignificantChange = average > 10; // Only update if there's actual audio activity
            
            if (hasSignificantChange) {
              setIsAudioActive(true);
              setFftData(newFftData);
            } else {
              setIsAudioActive(false);
              // Use a simplified array for inactive state to reduce updates
              setFftData(Array(128).fill(0));
            }
            
            lastUpdateRef.current = now;
          }
          
          // Continue animation loop only if everything is still valid and component is mounted
          if (isMountedRef.current && analyserRef.current && audioContextRef.current?.state === 'running') {
            animationFrameId = requestAnimationFrame(updateAudioVisualization);
            animationFrameRef.current = animationFrameId;
          }
        };
        
        // Start animation loop
        updateAudioVisualization();
        
        console.log("AudioVideoContainer: Audio visualization initialized successfully");
      } catch (error) {
        console.error("AudioVideoContainer: Error initializing audio:", error);
      }
    };
    
    // Initialize audio visualization
    initializeAudio();
    
    // Cleanup function
    return () => {
      console.log("AudioVideoContainer: Cleaning up audio resources");
      isMountedRef.current = false;
      
      // Stop animation loop
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        console.log("AudioVideoContainer: Cancelled animation frame");
      }
      
      // Disconnect audio nodes
      if (mediaStreamSourceRef.current) {
        mediaStreamSourceRef.current.disconnect();
        console.log("AudioVideoContainer: Disconnected media stream source");
      }
      
      // Stop audio tracks
      if (audioStreamRef.current) {
        audioStreamRef.current.getAudioTracks().forEach(track => {
          console.log(`AudioVideoContainer: Stopping audio track: ${track.label}`);
          track.stop();
        });
        console.log("AudioVideoContainer: Stopped all audio tracks");
      }
      
      // Close audio context
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().then(() => {
          console.log("AudioVideoContainer: Closed audio context");
        }).catch(err => {
          console.error("AudioVideoContainer: Error closing audio context:", err);
        });
      }
    };
  }, []);
  
  useEffect(() => {
    const handleCallEnd = () => {
      console.log("AudioVideoContainer: Detected call end, cleaning up audio resources");
      
      // Stop animation loop
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        console.log("AudioVideoContainer: Cancelled animation frame");
      }
      
      // Disconnect audio nodes
      if (mediaStreamSourceRef.current) {
        mediaStreamSourceRef.current.disconnect();
        console.log("AudioVideoContainer: Disconnected media stream source");
      }
      
      // Stop audio tracks
      if (audioStreamRef.current) {
        audioStreamRef.current.getAudioTracks().forEach(track => {
          console.log(`AudioVideoContainer: Stopping audio track: ${track.label}, enabled: ${track.enabled}, readyState: ${track.readyState}`);
          track.stop();
          console.log(`AudioVideoContainer: After stopping - readyState: ${track.readyState}`);
        });
        console.log("AudioVideoContainer: Stopped all audio tracks");
      }
      
      // Close audio context
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().then(() => {
          console.log("AudioVideoContainer: Closed audio context");
        }).catch(err => {
          console.error("AudioVideoContainer: Error closing audio context:", err);
        });
      }
      
      // Reset state
      setIsAudioActive(false);
      setFftData([]);
    };
    
    // Listen for custom call end event
    window.addEventListener('hume:call-ended', handleCallEnd);
    
    return () => {
      window.removeEventListener('hume:call-ended', handleCallEnd);
    };
  }, []);

  return (
    <div className="w-full h-32 sm:h-36 md:h-40 relative">
      {/* Always show audio visualizer */}
      <div className="absolute inset-0 flex items-center justify-center">
        <AudioVisualizerBall 
          fft={fftData} 
          isActive={isAudioActive} 
          className="w-full h-full"
        />
      </div>
    </div>
  );
}
