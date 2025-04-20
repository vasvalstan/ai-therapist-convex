"use client";

import { useEffect, useRef, useState, createContext, useContext } from "react";
import { FaceTrackedVideo } from "./FaceTrackedVideo";
import { TopEmotions } from "./TopEmotions";
import { LoaderSet } from "./LoaderSet";
import { Descriptor } from "./Descriptor";
import { TrackedFace } from "@/lib/data/trackedFace";
import { Emotion, EmotionName } from "@/lib/data/emotion";
import { FacePrediction } from "@/lib/data/facePrediction";
import { VideoRecorder } from "@/lib/media/videoRecorder";
import { blobToBase64 } from "@/lib/utilities/blobUtilities";
import { Environment, getApiUrlWs } from "@/lib/utilities/environmentUtilities";
import { toast } from "@/components/ui/use-toast";

// Create an emotion context to share emotion data across components
export interface EmotionContextType {
  emotions: Emotion[];
  dominantEmotion: Emotion | null;
  emotionHistory: Array<{timestamp: number, emotion: Emotion}>;
  emotionChanged: boolean;
}

export const EmotionContext = createContext<EmotionContextType>({
  emotions: [],
  dominantEmotion: null,
  emotionHistory: [],
  emotionChanged: false
});

export const useEmotionContext = () => useContext(EmotionContext);

type FaceWidgetsProps = {
  apiKey: string;
  onClose?: () => void;
  compact?: boolean; // New prop for compact mode
};

export function FaceWidgets({ apiKey, onClose, compact = false }: FaceWidgetsProps) {
  const socketRef = useRef<WebSocket | null>(null);
  const recorderRef = useRef<VideoRecorder | null>(null);
  const photoRef = useRef<HTMLCanvasElement | null>(null);
  const mountRef = useRef(true);
  const recorderCreated = useRef(false);
  const numReconnects = useRef(0);
  const [trackedFaces, setTrackedFaces] = useState<TrackedFace[]>([]);
  const [emotions, setEmotions] = useState<Emotion[]>([]);
  const [emotionHistory, setEmotionHistory] = useState<Array<{timestamp: number, emotion: Emotion}>>([]);
  const [emotionChanged, setEmotionChanged] = useState(false);
  const [dominantEmotion, setDominantEmotion] = useState<Emotion | null>(null);
  const [status, setStatus] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const numLoaderLevels = 5;
  const maxReconnects = 5; // Increased from 3 to 5 for more retry attempts
  const loaderNames: EmotionName[] = [
    "Calmness",
    "Joy",
    "Amusement",
    "Anger",
    "Confusion",
    "Disgust",
    "Sadness",
    "Horror",
    "Surprise (negative)",
  ];

  useEffect(() => {
    console.log("Mounting component");
    mountRef.current = true;
    console.log("Connecting to server");
    connect();

    return () => {
      console.log("Tearing down component");
      stopEverything();
    };
  }, []);

  // Update dominant emotion when emotions change
  useEffect(() => {
    if (emotions.length > 0) {
      const newDominantEmotion = emotions[0];
      
      // Check if the dominant emotion has changed significantly
      if (!dominantEmotion || 
          dominantEmotion.name !== newDominantEmotion.name || 
          Math.abs(dominantEmotion.score - newDominantEmotion.score) > 0.15) {
        
        setDominantEmotion(newDominantEmotion);
        setEmotionChanged(true);
        
        // Add to emotion history
        setEmotionHistory(prev => {
          const newHistory = [...prev, {timestamp: Date.now(), emotion: newDominantEmotion}];
          // Keep only the last 10 emotions
          return newHistory.slice(-10);
        });
        
        // Reset the changed flag after 5 seconds
        setTimeout(() => {
          setEmotionChanged(false);
        }, 5000);
      }
    }
  }, [emotions, dominantEmotion]);

  function connect() {
    if (isConnecting) {
      console.log("Already attempting to connect, skipping");
      return;
    }

    setIsConnecting(true);
    const socket = socketRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      console.log("Socket already exists, will not create");
      setIsConnecting(false);
    } else {
      try {
        const baseUrl = getApiUrlWs(Environment.Prod);
        const endpointUrl = `${baseUrl}/v0/stream/models`;
        const socketUrl = `${endpointUrl}?apikey=${apiKey}`;
        console.log(`Connecting to websocket... (using ${endpointUrl})`);
        setStatus(`Connecting to server...`);

        const socket = new WebSocket(socketUrl);

        socket.onopen = socketOnOpen;
        socket.onmessage = socketOnMessage;
        socket.onclose = socketOnClose;
        socket.onerror = socketOnError;

        socketRef.current = socket;
        
        // Set a timeout to detect connection failures
        setTimeout(() => {
          if (socket.readyState !== WebSocket.OPEN) {
            console.warn("WebSocket connection timeout");
            socket.close();
          }
        }, 10000); // 10 second timeout
      } catch (error) {
        console.error("Error creating WebSocket:", error);
        setStatus("Failed to connect to the Hume API. Please check your internet connection.");
        setIsConnecting(false);
        
        // Try to reconnect after a delay
        setTimeout(() => {
          if (mountRef.current && numReconnects.current < maxReconnects) {
            numReconnects.current++;
            connect();
          }
        }, 3000);
      }
    }
  }

  async function socketOnOpen() {
    console.log("Connected to websocket");
    setStatus("Connecting to webcam...");
    setIsConnecting(false);
    numReconnects.current = 0; // Reset reconnect counter on successful connection
    
    if (recorderRef.current) {
      console.log("Video recorder found, will use open socket");
      await capturePhoto();
    } else {
      console.warn("No video recorder exists yet to use with the open socket");
    }
  }

  async function socketOnMessage(event: MessageEvent) {
    setStatus("");
    try {
      const response = JSON.parse(event.data);
      console.log("Got response", response);
      const predictions: FacePrediction[] = response.face?.predictions || [];
      const warning = response.face?.warning || "";
      const error = response.error;
      if (error) {
        setStatus(error);
        console.error(error);
        stopEverything();
        return;
      }

      if (predictions.length === 0) {
        setStatus(warning.replace(".", ""));
        setEmotions([]);
      }

      const newTrackedFaces: TrackedFace[] = [];
      predictions.forEach(async (pred: FacePrediction, dataIndex: number) => {
        newTrackedFaces.push({ boundingBox: pred.bbox });
        if (dataIndex === 0) {
          const newEmotions = pred.emotions;
          setEmotions(newEmotions);
          
          // Store emotion data in localStorage for potential later use
          try {
            localStorage.setItem('hume_emotions', JSON.stringify({
              timestamp: new Date().toISOString(),
              emotions: newEmotions.slice(0, 5).map(e => ({ name: e.name, score: e.score }))
            }));
          } catch (e) {
            console.error("Error saving to localStorage:", e);
          }
        }
      });
      setTrackedFaces(newTrackedFaces);

      await capturePhoto();
    } catch (error) {
      console.error("Error processing message:", error);
      setStatus("Error processing response from server");
    }
  }

  async function socketOnClose(event: CloseEvent) {
    console.log("Socket closed with code:", event.code, "reason:", event.reason);
    setIsConnecting(false);

    if (mountRef.current === true) {
      if (event.code === 1000) {
        // Normal closure
        setStatus("Connection closed normally");
      } else {
        setStatus("Connection lost. Reconnecting...");
        console.log("Component still mounted, will reconnect...");
        
        // Add a delay before reconnecting
        setTimeout(() => {
          if (mountRef.current && numReconnects.current < maxReconnects) {
            connect();
          }
        }, 2000);
      }
    } else {
      console.log("Component unmounted, will not reconnect...");
    }
  }

  async function socketOnError(event: Event) {
    console.error("Socket failed to connect: ", event);
    setIsConnecting(false);
    
    if (numReconnects.current >= maxReconnects) {
      setStatus(`Failed to connect to the Hume API. Please check your API key and internet connection.`);
      toast({
        title: "Connection Error",
        description: "Failed to connect to the Hume API. Please try again later.",
        variant: "destructive",
      });
      stopEverything();
    } else {
      numReconnects.current++;
      console.warn(`Connection attempt ${numReconnects.current}`);
      setStatus(`Connection attempt ${numReconnects.current} of ${maxReconnects}...`);
      
      // Add a delay before reconnecting
      setTimeout(() => {
        if (mountRef.current) {
          connect();
        }
      }, 3000);
    }
  }

  function stopEverything() {
    console.log("Stopping everything...");
    mountRef.current = false;
    const socket = socketRef.current;
    if (socket) {
      console.log("Closing socket");
      socket.close();
      socketRef.current = null;
    } else {
      console.warn("Could not close socket, not initialized yet");
    }
    const recorder = recorderRef.current;
    if (recorder) {
      console.log("Stopping recorder");
      recorder.stopRecording();
      recorderRef.current = null;
    } else {
      console.warn("Could not stop recorder, not initialized yet");
    }
  }

  async function onVideoReady(videoElement: HTMLVideoElement) {
    console.log("Video element is ready");

    if (!photoRef.current) {
      console.error("No photo element found");
      return;
    }

    if (!recorderRef.current && recorderCreated.current === false) {
      console.log("No recorder yet, creating one now");
      recorderCreated.current = true;
      try {
        const recorder = await VideoRecorder.create(videoElement, photoRef.current);

        recorderRef.current = recorder;
        const socket = socketRef.current;
        if (socket && socket.readyState === WebSocket.OPEN) {
          console.log("Socket open, will use the new recorder");
          await capturePhoto();
        } else {
          console.warn("No socket available for sending photos");
        }
      } catch (error) {
        console.error("Failed to create video recorder:", error);
        setStatus("Failed to access camera. Please ensure camera permissions are granted.");
      }
    }
  }

  async function capturePhoto() {
    const recorder = recorderRef.current;

    if (!recorder) {
      console.error("No recorder found");
      return;
    }

    const photoBlob = await recorder.takePhoto();
    sendRequest(photoBlob);
  }

  async function sendRequest(photoBlob: Blob) {
    const socket = socketRef.current;

    if (!socket) {
      console.error("No socket found");
      return;
    }

    const encodedBlob = await blobToBase64(photoBlob);
    const requestData = JSON.stringify({
      data: encodedBlob,
      models: {
        face: {},
      },
    });

    if (socket.readyState === WebSocket.OPEN) {
      socket.send(requestData);
    } else {
      console.error("Socket connection not open. Will not capture a photo");
      socket.close();
    }
  }

  const videoSize = compact ? { width: 200, height: 150 } : { width: 500, height: 375 };

  // Provide emotion context value
  const emotionContextValue = {
    emotions,
    dominantEmotion,
    emotionHistory,
    emotionChanged
  };

  return (
    <EmotionContext.Provider value={emotionContextValue}>
      <div className="w-full h-full flex flex-col">
        {/* Video display with fixed dimensions to match audio visualizer */}
        <div className="relative w-full h-full flex justify-center">
          <FaceTrackedVideo
            className="w-full h-full"
            onVideoReady={onVideoReady}
            trackedFaces={trackedFaces}
            width={videoSize.width}
            height={videoSize.height}
          />
          {status && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 text-white text-center p-4">
              <div>{status}</div>
            </div>
          )}
        </div>
        
        {/* Hidden canvas for photo capture */}
        <canvas className="hidden" ref={photoRef}></canvas>
      </div>
      
      {/* Emotions display positioned below the video container */}
      <div className="mt-2 flex justify-center">
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg px-2 py-1 shadow-sm">
          <TopEmotions emotions={emotions} className="w-full" />
        </div>
      </div>
    </EmotionContext.Provider>
  );
}
