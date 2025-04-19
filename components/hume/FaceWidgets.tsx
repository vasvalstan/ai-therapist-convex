"use client";

import { useEffect, useRef, useState } from "react";
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
            localStorage.setItem('hume_metadata', JSON.stringify({
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

  const containerClass = compact 
    ? "bg-white dark:bg-gray-900 p-3 rounded-lg shadow-md max-w-full mx-auto" 
    : "bg-white dark:bg-gray-900 p-6 rounded-lg shadow-lg max-w-4xl mx-auto";

  const videoSize = compact ? { width: 320, height: 240 } : { width: 500, height: 375 };
  const videoClass = compact ? "mb-3 scale-90 origin-top-left" : "mb-6";
  
  return (
    <div className={containerClass}>
      {!compact && (
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Facial Expression Analysis</h2>
          {onClose && (
            <button 
              onClick={onClose} 
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          )}
        </div>
      )}
      
      <div className={compact ? "flex flex-col" : "md:flex gap-8"}>
        <FaceTrackedVideo
          className={videoClass}
          onVideoReady={onVideoReady}
          trackedFaces={trackedFaces}
          width={videoSize.width}
          height={videoSize.height}
        />
        <div className={compact ? "mt-2" : "flex-1"}>
          {compact ? (
            <TopEmotions emotions={emotions} />
          ) : (
            <>
              <TopEmotions emotions={emotions} />
              <LoaderSet
                className="mt-8"
                emotionNames={loaderNames}
                emotions={emotions}
                numLevels={numLoaderLevels}
              />
              <Descriptor className="mt-8" emotions={emotions} />
            </>
          )}
        </div>
      </div>

      {status && (
        <div className={`${compact ? "mt-2 text-sm" : "mt-4"} p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded`}>
          {status}
        </div>
      )}
      <canvas className="hidden" ref={photoRef}></canvas>
    </div>
  );
}
