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
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  
  useEffect(() => {
    let animationFrameId: number | null = null;
    
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
          if (!analyserRef.current) return;
          
          analyserRef.current.getByteFrequencyData(dataArray);
          
          // Calculate average frequency
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
          }
          const average = sum / bufferLength;
          
          // Update audio level state (0-100 scale)
          setIsAudioActive(true);
          setFftData(Array.from(dataArray).map(value => value / 255));
          
          // Continue animation loop
          animationFrameId = requestAnimationFrame(updateAudioVisualization);
          animationFrameRef.current = animationFrameId;
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
  }, [isFaceTrackingEnabled]);
  
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
