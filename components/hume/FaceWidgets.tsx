"use client";

declare global {
  interface Window {
    activeMediaStreams?: MediaStream[];
  }
}

import { useEffect, useRef, useState, createContext, useContext } from "react";
import { FaceTrackedVideo } from "./FaceTrackedVideo";
import { TopEmotions } from "./TopEmotions";
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

  // Clean up when unmounting
  useEffect(() => {
    return () => {
      // Close WebSocket connection if open
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        console.log("FaceWidgets: Closing WebSocket connection on unmount");
        socketRef.current.close();
      }
      
      // Store the fact that face tracking is disabled
      localStorage.setItem('face_tracking_disabled', 'true');
    };
  }, []);

  // Track and store active video streams for cleanup
  useEffect(() => {
    // Store video stream for cleanup when component unmounts
    const storeVideoStream = (stream: MediaStream) => {
      if (!window.activeMediaStreams) {
        window.activeMediaStreams = [];
      }
      
      // Only add if not already in the array
      const activeStreams = window.activeMediaStreams;
      if (!activeStreams.includes(stream)) {
        console.log("FaceWidgets: Storing video stream for cleanup");
        activeStreams.push(stream);
      }
    };
    
    // When face tracking is enabled, listen for video streams
    if (true) { // Always listen for video streams
      // Create a MutationObserver to detect when video elements are added to the DOM
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList') {
            mutation.addedNodes.forEach((node) => {
              // Check if the added node is a video element or contains video elements
              if (node instanceof HTMLVideoElement) {
                if (node.srcObject instanceof MediaStream) {
                  storeVideoStream(node.srcObject);
                }
              } else if (node instanceof Element) {
                // Look for video elements within the added node
                const videos = node.querySelectorAll('video');
                videos.forEach(video => {
                  if (video.srcObject instanceof MediaStream) {
                    storeVideoStream(video.srcObject);
                  }
                });
              }
            });
          }
        });
      });
      
      // Start observing the document body for video elements
      observer.observe(document.body, { childList: true, subtree: true });
      
      // Cleanup function
      return () => {
        observer.disconnect();
      };
    }
  }, []);

  // Listen for call end events to clean up resources
  useEffect(() => {
    const handleCallEnd = () => {
      console.log("FaceWidgets: Detected call end, cleaning up face tracking resources");
      
      // Close WebSocket connection if open
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        console.log("FaceWidgets: Closing WebSocket connection");
        socketRef.current.close();
      }
      
      // Clear tracked faces
      setTrackedFaces([]);
      
      // Clear emotions
      setEmotions([]);
    };
    
    // Listen for custom call end event
    window.addEventListener('hume:call-ended', handleCallEnd);
    
    return () => {
      window.removeEventListener('hume:call-ended', handleCallEnd);
    };
  }, []);

  // Add a function to test the WebSocket connection
  async function testWebSocketConnection() {
    if (!apiKey) {
      console.error("Cannot test WebSocket connection without API key");
      return false;
    }
    
    return new Promise<boolean>((resolve) => {
      try {
        const baseUrl = getApiUrlWs(Environment.Prod);
        const testUrl = `${baseUrl}/v0/stream/models?apikey=${apiKey}`;
        
        // Log a masked version of the API key for debugging
        const maskedKey = apiKey.substring(0, 4) + '***';
        console.log(`Testing WebSocket connection with API key starting with: ${maskedKey}`);
        console.log(`WebSocket URL: ${baseUrl}/v0/stream/models?apikey=***`);
        
        const testSocket = new WebSocket(testUrl);
        
        // Set a timeout for the connection test
        const timeout = setTimeout(() => {
          console.error("WebSocket connection test timed out after 5 seconds");
          testSocket.close();
          resolve(false);
        }, 5000);
        
        testSocket.onopen = () => {
          console.log("WebSocket connection test successful!");
          clearTimeout(timeout);
          testSocket.close();
          resolve(true);
        };
        
        testSocket.onerror = (event) => {
          console.error("WebSocket connection test failed:", event);
          // Check if we're in a secure context
          if (window.isSecureContext) {
            console.log("Running in secure context (https)");
          } else {
            console.warn("Not running in secure context - WebSockets might be restricted");
          }
          clearTimeout(timeout);
          resolve(false);
        };
      } catch (error) {
        console.error("Error during WebSocket connection test:", error);
        resolve(false);
      }
    });
  }

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
        if (!apiKey) {
          console.error("No API key provided to FaceWidgets component");
          setStatus("Error: API key is missing. Please refresh the page and try again.");
          setIsConnecting(false);
          return;
        }

        // First test the WebSocket connection
        testWebSocketConnection().then(async (isConnected) => {
          if (!isConnected) {
            console.error("WebSocket connection test failed, trying alternative approach");
            setStatus("Connection test failed. Trying alternative approach...");
            
            // Try an alternative approach - some networks block WebSockets
            // You might need to implement a fallback mechanism here
            // For now, we'll just try to reconnect with a delay
            setTimeout(() => {
              if (mountRef.current && numReconnects.current < maxReconnects) {
                numReconnects.current++;
                connect();
              } else {
                setStatus("Failed to connect. Please check your network settings and try again.");
              }
            }, 3000);
            return;
          }
          
          // If the test succeeded, proceed with the actual connection
          const baseUrl = getApiUrlWs(Environment.Prod);
          const endpointUrl = `${baseUrl}/v0/stream/models`;
          
          // The correct format is to use the apiKey as a query parameter
          // This is the standard way to authenticate WebSocket connections with Hume AI
          const socketUrl = `${endpointUrl}?apikey=${apiKey}`;
          
          console.log(`Connecting to websocket... (using ${endpointUrl})`);
          console.log(`API key length: ${apiKey.length} characters`);
          console.log(`First 5 characters of API key: ${apiKey.substring(0, 5)}...`);
          setStatus(`Connecting to server...`);

          // Create WebSocket with explicit error handling
          try {
            // Create the WebSocket connection
            const socket = new WebSocket(socketUrl);

            // Add event listeners with explicit error handling
            socket.onopen = (event) => {
              try {
                socketOnOpen(event);
              } catch (error) {
                console.error("Error in onopen handler:", error);
              }
            };
            
            socket.onmessage = (event) => {
              try {
                socketOnMessage(event);
              } catch (error) {
                console.error("Error in onmessage handler:", error);
              }
            };
            
            socket.onclose = (event) => {
              try {
                socketOnClose(event);
              } catch (error) {
                console.error("Error in onclose handler:", error);
              }
            };
            
            socket.onerror = (event) => {
              try {
                console.error("WebSocket error event details:", {
                  type: event.type,
                  target: event.target,
                  eventPhase: event.eventPhase,
                  bubbles: event.bubbles,
                  cancelable: event.cancelable,
                  composed: event.composed,
                  timeStamp: event.timeStamp,
                  isTrusted: event.isTrusted,
                  currentTarget: event.currentTarget
                });
                socketOnError(event);
              } catch (error) {
                console.error("Error in onerror handler:", error);
              }
            };

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
        });
      } catch (error) {
        console.error("Error connecting to WebSocket:", error);
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

  async function socketOnOpen(event: Event) {
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
    console.error("WebSocket error details:", {
      apiKeyProvided: !!apiKey,
      apiKeyLength: apiKey ? apiKey.length : 0,
      apiKeyFirstChars: apiKey ? apiKey.substring(0, 5) + '...' : 'none',
      reconnectAttempt: numReconnects.current,
      socketUrl: apiKey ? `${getApiUrlWs(Environment.Prod)}/v0/stream/models?apikey=${apiKey.substring(0, 5)}...` : 'none'
    });
    
    // Check if the API key might be invalid
    if (apiKey && apiKey.length < 20) {
      console.error("API key appears to be invalid or truncated");
      setStatus("Error: Invalid API key format. Please refresh and try again.");
      stopEverything();
      return;
    }
    
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
          // Try to refresh the API key before reconnecting
          if (numReconnects.current === 3) {
            console.log("Attempting to refresh API key before reconnecting...");
            // Force a refresh of the parent component to get a new API key
            window.dispatchEvent(new CustomEvent('hume-refresh-api-key'));
          }
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
