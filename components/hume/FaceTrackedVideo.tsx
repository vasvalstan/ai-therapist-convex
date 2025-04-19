"use client";

import { useEffect, useRef, useState } from "react";
import { TrackedFace } from "@/lib/data/trackedFace";

type FaceTrackedVideoProps = {
  className?: string;
  trackedFaces: TrackedFace[];
  onVideoReady: (video: HTMLVideoElement) => void;
  width: number;
  height: number;
};

export function FaceTrackedVideo({ className, trackedFaces, onVideoReady, width, height }: FaceTrackedVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [videoReady, setVideoReady] = useState(false);
  className = className || "";

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) {
      console.error("Missing video element");
      return;
    }

    // Set up video element
    videoElement.addEventListener('loadedmetadata', () => {
      setVideoReady(true);
    });

    onVideoReady(videoElement);
  }, [onVideoReady]);

  // We're still tracking faces, but not displaying the oval
  useEffect(() => {
    if (!videoReady) return;

    const canvasElement = canvasRef.current;
    const videoElement = videoRef.current;
    const graphics = canvasElement?.getContext("2d");

    if (!canvasElement || !videoElement || !graphics) {
      return;
    }

    // Set canvas dimensions to match video
    canvasElement.width = width;
    canvasElement.height = height;
    
    // Clear previous drawings - we're not drawing anything visible
    graphics.clearRect(0, 0, canvasElement.width, canvasElement.height);

    // We still process face tracking data, but don't render anything visible
    // This allows the emotion tracking to work without showing the oval
  }, [trackedFaces, width, height, videoReady]);

  return (
    <div 
      className={`relative overflow-hidden rounded-lg border border-neutral-300 bg-black ${className}`}
      style={{ width: `${width}px`, height: `${height}px` }}
    >
      <video 
        className="absolute -scale-x-[1] w-full h-full object-cover" 
        ref={videoRef} 
        autoPlay 
        playsInline
        muted
      ></video>
      <canvas 
        className="absolute top-0 left-0 w-full h-full opacity-0" 
        ref={canvasRef}
      ></canvas>
    </div>
  );
}
