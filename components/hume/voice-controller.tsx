"use client";

import { useVoice } from "@humeai/voice-react";
import { useEffect, useRef, useState, useCallback } from "react";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery, useAction } from "convex/react";
import { toast } from "@/components/ui/use-toast";
import { SaveChatHistory } from "@/components/hume/save-chat-history";
import { useSaveTranscript } from "@/lib/hooks/useSaveTranscript";
import { useSaveHumeChat } from "@/app/handlers/chat-save-handler";
import { fetchVoiceConfig } from "@/lib/client/voiceService";

// Define the message type constants that match the Convex schema
type MessageType = "USER_MESSAGE" | "AGENT_MESSAGE" | "SYSTEM_MESSAGE" | "CHAT_METADATA";
type MessageRole = "USER" | "ASSISTANT" | "SYSTEM";

// Utility function to generate a UUID safely in browser or Node.js environment
function generateUUID(): string {
  // Use crypto.randomUUID if available (modern browsers)
  if (typeof window !== 'undefined' && window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }
  
  // Fallback for older browsers - simple random ID
  return 'xxxx-xxxx-xxxx-xxxx'.replace(/[x]/g, function() {
    return (Math.random() * 16 | 0).toString(16);
  });
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp?: number;
  emotions?: Record<string, any>;
}

interface VoiceControllerProps {
  initialMessages?: ChatMessage[];
  sessionId?: string;
}

interface HumeEvent {
  type: string;
  role?: string;
  messageText?: string;
  timestamp: number | string;
  emotionFeatures?: any;
  chatId?: string;
  chatGroupId?: string;
  requestId?: string;
  metadata?: {
    chat_id: string;
    chat_group_id: string;
    request_id?: string;
    timestamp: string;
  };
}

// Add logging constants
const VOICE_STATUS_LOG_PREFIX = "🎤 [VOICE_STATUS]";
const INACTIVITY_LOG_PREFIX = "🕒 [INACTIVITY]";

export function VoiceController({ initialMessages = [], sessionId: propSessionId }: VoiceControllerProps) {
  const voice = useVoice();
  const prevStatusRef = useRef<string | undefined>(undefined);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(propSessionId || null);
  const [chatMetadata, setChatMetadata] = useState<{
    chatId?: string;
    chatGroupId?: string;
    requestId?: string;
  } | null>(null);
  
  // Add Convex mutation to update metadata
  const updateAndVerifyMetadata = useMutation(api.chat.updateAndVerifyMetadata);
  
  // Extract session ID from the URL or use a generated one only if not provided as prop
  useEffect(() => {
    if (!propSessionId) {
      const urlParams = new URLSearchParams(window.location.search);
      const sessionId = urlParams.get('sessionId') || `session_${Date.now()}`;
      setCurrentSessionId(sessionId);
      console.log("Chat session created from URL/generated:", sessionId);
    } else {
      console.log("Using provided session ID:", propSessionId);
    }
  }, [propSessionId]);

  // Initialize voice connection
  useEffect(() => {
    if (!voice || !currentSessionId) return;

    const connect = async () => {
      try {
        console.log("Connecting to voice service...");
        
        // Fetch configuration from our server-side API
        const config = await fetchVoiceConfig();
        
        if (!config) {
          console.error("Failed to get voice service configuration");
          toast({
            title: "Connection Error",
            description: "Failed to get voice service configuration. Please try again.",
            variant: "destructive",
          });
          return;
        }
        
        // Connect to the voice service
        await voice.connect();
      } catch (error) {
        console.error("Error connecting to voice service:", error);
        toast({
          title: "Connection Error",
          description: "Failed to connect to voice service. Please try again.",
          variant: "destructive",
        });
      }
    };

    connect();

    return () => {
      if (voice.disconnect) {
        voice.disconnect();
      }
    };
  }, [voice, currentSessionId]);

  // Handle voice status changes and events
  useEffect(() => {
    if (!voice || !currentSessionId) return;

    // Track status changes
    if (voice.status) {
      const currentStatus = voice.status.value;
      if (prevStatusRef.current !== currentStatus) {
        console.log(`${VOICE_STATUS_LOG_PREFIX} Voice status changed from ${prevStatusRef.current} to ${currentStatus}`);
        prevStatusRef.current = currentStatus;
      }
    }
    
    // Store metadata and update in database
    if (voice.chatMetadata) {
      console.log("🎤 Received chat metadata from Hume:", voice.chatMetadata);
      console.log("🔍 Metadata structure:", JSON.stringify(voice.chatMetadata, null, 2));
      
      // Check that we have metadata with the required fields
      if (voice.chatMetadata.chatId && voice.chatMetadata.chatGroupId) {
        const newMetadata = {
          chatId: voice.chatMetadata.chatId,
          chatGroupId: voice.chatMetadata.chatGroupId,
          requestId: voice.chatMetadata.requestId
        };
        
        console.log(`🔑 VoiceController storing metadata values: chatId=${newMetadata.chatId}, chatGroupId=${newMetadata.chatGroupId}`);
        setChatMetadata(newMetadata);
        
        // Update the metadata in the database
        if (currentSessionId && newMetadata.chatId && newMetadata.chatGroupId) {
          console.log(`📝 VoiceController updating metadata in database for session: ${currentSessionId}`);
          console.log(`📝 Using Hume IDs: chatId=${newMetadata.chatId}, chatGroupId=${newMetadata.chatGroupId}`);
          
          updateAndVerifyMetadata({
            sessionId: currentSessionId,
            chatId: newMetadata.chatId,
            chatGroupId: newMetadata.chatGroupId,
            requestId: newMetadata.requestId || crypto.randomUUID(),
            receivedAt: new Date().toISOString()
          }).then((result) => {
            console.log("✅ VoiceController successfully stored chat metadata:", result);
          }).catch(error => {
            console.error("❌ VoiceController error storing chat metadata:", error);
          });
        } else {
          console.warn("⚠️ Missing required data to update metadata:", {
            currentSessionId,
            chatId: newMetadata.chatId,
            chatGroupId: newMetadata.chatGroupId
          });
        }
      } else {
        console.warn("⚠️ Voice provided metadata is missing required fields:", voice.chatMetadata);
      }
    }
  }, [voice, currentSessionId, updateAndVerifyMetadata]);
  
  // Manual function to get metadata and save it to the database
  const forceUpdateMetadata = () => {
    if (!voice || !currentSessionId || !voice.chatMetadata) {
      console.warn("Cannot update metadata: required data missing");
      return;
    }
    
    // Try to get metadata
    const metadata = voice.chatMetadata;
    if (metadata.chatId && metadata.chatGroupId) {
      console.log("🔄 Force updating metadata in database with:", {
        chatId: metadata.chatId,
        chatGroupId: metadata.chatGroupId
      });
      
      updateAndVerifyMetadata({
        sessionId: currentSessionId,
        chatId: metadata.chatId,
        chatGroupId: metadata.chatGroupId,
        requestId: metadata.requestId || crypto.randomUUID(),
        receivedAt: new Date().toISOString()
      }).then(result => {
        console.log("✅ Force update successful:", result);
        
        // Also update local state
        setChatMetadata({
          chatId: metadata.chatId,
          chatGroupId: metadata.chatGroupId,
          requestId: metadata.requestId
        });
      }).catch(error => {
        console.error("❌ Force update failed:", error);
      });
    } else {
      console.error("❌ Cannot force update: metadata not available");
    }
  };
  
  // Function to create a new session with the current Hume IDs
  const createNewSessionWithHumeIds = () => {
    if (!chatMetadata?.chatId || !chatMetadata?.chatGroupId) {
      console.error("Cannot create new session: missing Hume IDs");
      toast({
        title: "Cannot create new session",
        description: "Missing Hume chat IDs. Please start a new conversation.",
        variant: "destructive"
      });
      return;
    }
    
    console.log("🆕 Creating a new session with Hume IDs:", {
      chatId: chatMetadata.chatId,
      chatGroupId: chatMetadata.chatGroupId
    });
    
    // Call the API to create a new session
    fetch(`/api/session-lookup?chatId=${chatMetadata.chatId}&chatGroupId=${chatMetadata.chatGroupId}&autoCreate=true`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to create session: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        console.log("✅ New session created:", data);
        toast({
          title: "New session created",
          description: `Created session ${data.sessionId} with your Hume chat IDs. You may need to reload the page.`,
        });
        
        // Redirect to the new session
        if (data.sessionId) {
          const redirect = confirm("Do you want to go to the new session now?");
          if (redirect) {
            window.location.href = `/chat/${data.sessionId}?tab=chat`;
          }
        }
      })
      .catch(error => {
        console.error("❌ Failed to create new session:", error);
        toast({
          title: "Failed to create new session",
          description: String(error),
          variant: "destructive"
        });
      });
  };
  
  // Handle page visibility and time expiration
  useEffect(() => {
    const handleTimeExpired = () => {
      console.log("Time expired event received, forcing disconnect");
      
      const saveMessage = document.createElement('div');
      saveMessage.className = 'fixed top-4 right-4 bg-green-100 text-green-800 p-3 rounded shadow-md z-50';
      saveMessage.textContent = 'Saving your chat before disconnecting...';
      document.body.appendChild(saveMessage);
      
      const saveEvent = new CustomEvent('saveChat', {
        detail: { reason: "timeExpired" }
      });
      window.dispatchEvent(saveEvent);
      
      setTimeout(() => {
        if (voice && voice.disconnect) {
          voice.disconnect();
        }
        
        saveMessage.textContent = 'Your chat has been saved!';
        setTimeout(() => {
          saveMessage.remove();
        }, 3000);
      }, 1000);
    };
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        console.log("Page hidden, saving chat");
        const saveEvent = new CustomEvent('saveChat', {
          detail: { reason: "visibilityChange" }
        });
        window.dispatchEvent(saveEvent);
      }
    };
    
    window.addEventListener('timeExpired', handleTimeExpired);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('timeExpired', handleTimeExpired);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [voice]);
  
  // Initialize messages with chat history
  useEffect(() => {
    if (initialMessages.length > 0) {
      setMessages(initialMessages);
    }
  }, [initialMessages]);
  
  return (
    <>
      {currentSessionId && (
        <ChatSaveHandler 
          sessionId={currentSessionId} 
          humeChatId={chatMetadata?.chatId}
          humeGroupChatId={chatMetadata?.chatGroupId}
        />
      )}
      {/* Add debug display of metadata for development */}
      {process.env.NODE_ENV !== 'production' && chatMetadata && (
        <div className="fixed top-4 right-4 bg-white/80 text-black p-2 rounded shadow-md z-50 text-xs font-mono">
          <div>Debug Info:</div>
          <div>Session: {currentSessionId}</div>
          <div>ChatID: {chatMetadata.chatId}</div>
          <div>GroupID: {chatMetadata.chatGroupId}</div>
          <div className="flex space-x-2 mt-2">
            <button 
              onClick={forceUpdateMetadata}
              className="bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 text-xs"
            >
              Force Update Metadata
            </button>
            <button 
              onClick={createNewSessionWithHumeIds}
              className="bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600 text-xs"
            >
              Create New Session
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// Helper to generate mock events for testing
function generateMockEvents(sessionId: string, humeChatId?: string, humeGroupChatId?: string): HumeEvent[] {
  const now = Date.now();
  const chatId = humeChatId || sessionId;
  const chatGroupId = humeGroupChatId || sessionId;
  
  return [
    {
      type: "CHAT_METADATA",
      role: "SYSTEM",
      messageText: "Chat started",
      timestamp: now - 1000 * 60 * 5, // 5 minutes ago
      chatId,
      chatGroupId
    },
    {
      type: "USER_MESSAGE",
      role: "USER",
      messageText: "Hello, how are you?",
      timestamp: now - 1000 * 60 * 4, // 4 minutes ago
      emotionFeatures: JSON.stringify({ neutral: 0.8, calm: 0.7, happy: 0.2 }),
      chatId,
      chatGroupId
    },
    {
      type: "AGENT_MESSAGE",
      role: "ASSISTANT",
      messageText: "I'm doing well, thank you for asking. How are you feeling today?",
      timestamp: now - 1000 * 60 * 3.5, // 3.5 minutes ago
      chatId,
      chatGroupId
    },
    {
      type: "USER_MESSAGE",
      role: "USER",
      messageText: "I'm feeling a bit anxious about my upcoming presentation.",
      timestamp: now - 1000 * 60 * 3, // 3 minutes ago
      emotionFeatures: JSON.stringify({ anxious: 0.6, stressed: 0.5, worried: 0.4 }),
      chatId,
      chatGroupId
    },
    {
      type: "AGENT_MESSAGE",
      role: "ASSISTANT",
      messageText: "I understand. It's normal to feel anxious before presentations. Would you like to talk about some techniques that might help reduce your anxiety?",
      timestamp: now - 1000 * 60 * 2, // 2 minutes ago
      chatId,
      chatGroupId
    },
    {
      type: "USER_MESSAGE",
      role: "USER",
      messageText: "Yes, that would be helpful.",
      timestamp: now - 1000 * 60 * 1, // 1 minute ago
      emotionFeatures: JSON.stringify({ hopeful: 0.4, anxious: 0.3, neutral: 0.3 }),
      chatId,
      chatGroupId
    }
  ];
}

// Constants for API endpoints
const apiUrl = '/api/hume/chat-events';

// A simplified component for saving the chat to our database
export function ChatSaveHandler({ sessionId, humeChatId, humeGroupChatId }: { 
  sessionId: string;
  humeChatId?: string;
  humeGroupChatId?: string;
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [storedChatId, setStoredChatId] = useState<string | null>(humeChatId || null);
  const [storedGroupChatId, setStoredGroupChatId] = useState<string | null>(humeGroupChatId || null);
  const [savedEvents, setSavedEvents] = useState<any[]>([]);
  
  // Add Convex mutations and actions
  const updateUserMinutes = useMutation(api.chat.updateUserRemainingMinutes);
  
  // Use our new helper for saving chat history
  const { saveChat } = useSaveHumeChat();
  
  // Import the hook for saving transcripts
  const { saveTranscript } = useSaveTranscript();
  
  // Ref to track if we've already attempted to save this chat
  const hasSavedRef = useRef(false);
  
  // Create a new query that uses both sessionId and chatId if available
  const debugSession = useQuery(api.chat.debugGetChatSession, { 
    sessionId,
    chatId: storedChatId || undefined,
    chatGroupId: storedGroupChatId || undefined
  });
  
  // Log props at component mount time
  useEffect(() => {
    console.log(`🔄 ChatSaveHandler mounted with props:`, {
      sessionId,
      humeChatId,
      humeGroupChatId
    });
    
    // Try to get metadata from localStorage
    try {
      const storedMetadata = localStorage.getItem('hume_metadata');
      if (storedMetadata) {
        const parsedMetadata = JSON.parse(storedMetadata);
        console.log(`📦 Found metadata in localStorage:`, parsedMetadata);
        
        if (parsedMetadata.chatId && !storedChatId) {
          console.log(`🔄 Using chatId from localStorage: ${parsedMetadata.chatId}`);
          setStoredChatId(parsedMetadata.chatId);
        }
        
        if (parsedMetadata.chatGroupId && !storedGroupChatId) {
          console.log(`🔄 Using chatGroupId from localStorage: ${parsedMetadata.chatGroupId}`);
          setStoredGroupChatId(parsedMetadata.chatGroupId);
        }
      }
    } catch (e) {
      console.error("Error reading from localStorage:", e);
    }
  }, []);
  
  // Update local state when props change
  useEffect(() => {
    console.log(`🔍 ChatSaveHandler props changed:`, {
      humeChatId,
      humeGroupChatId,
      storedChatId,
      storedGroupChatId
    });
    
    if (humeChatId && humeChatId !== storedChatId) {
      console.log(`📌 Storing Hume chatId: ${humeChatId}`);
      setStoredChatId(humeChatId);
    }
    if (humeGroupChatId && humeGroupChatId !== storedGroupChatId) {
      console.log(`📌 Storing Hume chatGroupId: ${humeGroupChatId}`);
      setStoredGroupChatId(humeGroupChatId);
    }
  }, [humeChatId, humeGroupChatId, storedChatId, storedGroupChatId]);

  const fetchEvents = async () => {
    // Determine which IDs to use for the API call
    let finalChatId = storedChatId;
    let finalGroupChatId = storedGroupChatId;
    
    // If we don't have the IDs stored in component state, check localStorage
    if (!finalChatId || !finalGroupChatId) {
      try {
        const storedMetadata = localStorage.getItem('hume_metadata');
        if (storedMetadata) {
          const parsedMetadata = JSON.parse(storedMetadata);
          if (parsedMetadata.chatId && !finalChatId) {
            console.log(`🔍 Using chatId from localStorage for API call: ${parsedMetadata.chatId}`);
            finalChatId = parsedMetadata.chatId;
            // Also update component state
            setStoredChatId(parsedMetadata.chatId);
          }
          
          if (parsedMetadata.chatGroupId && !finalGroupChatId) {
            console.log(`🔍 Using chatGroupId from localStorage for API call: ${parsedMetadata.chatGroupId}`);
            finalGroupChatId = parsedMetadata.chatGroupId;
            // Also update component state
            setStoredGroupChatId(parsedMetadata.chatGroupId);
          }
        }
      } catch (e) {
        console.error("Error reading from localStorage:", e);
      }
    }
    
    // If we still don't have IDs, use sessionId as fallback
    if (!finalChatId) {
      console.log(`❌ No chatId available, falling back to sessionId: ${sessionId}`);
      finalChatId = sessionId;
    }
    
    if (!finalGroupChatId) {
      console.log(`❌ No chatGroupId available, falling back to sessionId: ${sessionId}`);
      finalGroupChatId = sessionId;
    }
    
    console.log(`🔍 Fetching events from API with chatId: ${finalChatId}, chatGroupId: ${finalGroupChatId}`);

    try {
      const res = await fetch(
        `${apiUrl}?chat_id=${finalChatId}&group_id=${finalGroupChatId}`,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!res.ok) {
        console.error(`❌ Failed to fetch events: ${res.status} ${res.statusText}`);
        try {
          const errorData = await res.json();
          console.error('Error details:', errorData);
        } catch (e) {
          console.error('Could not parse error response');
        }
        
        // For testing purposes, return mock events if API fails
        setSavedEvents(generateMockEvents(sessionId, finalChatId, finalGroupChatId));
        return;
      }

      const data = await res.json();
      console.log(`✅ Fetched ${data.events.length} events`);
      setSavedEvents(data.events);
    } catch (error) {
      console.error("Error fetching events:", error);
      // For testing purposes, return mock events if API fails
      setSavedEvents(generateMockEvents(sessionId, finalChatId, finalGroupChatId));
    }
  };

  // Helper function to check metadata in database - will use data from the debugSession query
  const checkMetadataInDb = async (sessionId: string) => {
    console.log("Current session data in DB:", debugSession);
  };
  
  // Handle saving chat either manually or when triggered by events
  const handleSaveChat = async () => {
    if (isSaving) return;
    setIsSaving(true);

    try {
      console.log("Saving chat transcript for session:", sessionId);
      
      // First, check if we have the current chatId and chatGroupId in state or database
      let chatId = storedChatId;
      let chatGroupId = storedGroupChatId;
      let actualSessionId = sessionId;
      
      console.log(`🔍 Checking IDs - local state: chatId=${chatId}, chatGroupId=${chatGroupId}`);
      
      // Use session info from the query if available
      if (debugSession) {
        console.log("📋 Current session info:", debugSession);
        
        // If the database has values and we don't have local values, use the database values
        if (debugSession.found) {
          // CRITICAL: Use the actual session ID from the database if it's different
          if (debugSession.sessionId && debugSession.sessionId !== sessionId) {
            console.log(`⚠️ Session ID mismatch detected. URL/props has ${sessionId} but database has ${debugSession.sessionId}`);
            console.log(`✅ Using correct session ID from database: ${debugSession.sessionId}`);
            actualSessionId = debugSession.sessionId;
          }
          
          if (debugSession.chatId && !chatId) {
            console.log(`ℹ️ Using database chatId (${debugSession.chatId}) since no local value is available`);
            chatId = debugSession.chatId;
          }
          
          if (debugSession.chatGroupId && !chatGroupId) {
            console.log(`ℹ️ Using database chatGroupId (${debugSession.chatGroupId}) since no local value is available`);
            chatGroupId = debugSession.chatGroupId;
          }
        } else {
          console.warn("⚠️ Session not found in database by sessionId. This might be a mismatch issue.");
        }
      }
      
      // Only use sessionId as fallback if absolutely necessary
      if (!chatId) {
        console.warn(`⚠️ No chatId available, falling back to sessionId: ${sessionId}`);
        chatId = sessionId;
      }
      
      if (!chatGroupId) {
        console.warn(`⚠️ No chatGroupId available, falling back to sessionId: ${sessionId}`);
        chatGroupId = sessionId;
      }
      
      console.log(`🔤 Using chatId: ${chatId}, chatGroupId: ${chatGroupId}, sessionId: ${actualSessionId}`);
      
      if (!chatId) {
        throw new Error("No chat ID available to save history");
      }
      
      try {
        // Use our helper function which handles error cases better
        // Pass both the chatId and chatGroupId to the saveChat function
        const saveResult = await saveChat(chatId, chatGroupId);
        
        hasSavedRef.current = true;
        
        // Update user's remaining minutes after successful save
        try {
          await updateUserMinutes({
            sessionDurationMinutes: 1 // Default to 1 minute
          });
          console.log(`Updated user's remaining minutes: -1 minute`);
        } catch (minutesError) {
          console.warn("Error updating minutes, but transcript was saved:", minutesError);
        }
        
        toast({
          title: "Chat saved",
          description: `Your conversation with ${saveResult.messageCount} messages has been saved successfully.`,
        });
        
      } catch (error) {
        console.error("Error saving chat history:", error);
        
        toast({
          title: "Error saving chat",
          description: String(error) || "There was an error saving your conversation.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error in save workflow:", error);
      
      toast({
        title: "Error saving chat",
        description: "There was an error saving your conversation. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Check localStorage on mount for any Hume metadata
  useEffect(() => {
    const checkDbAndLocalStorage = async () => {
      console.log(`🔍 ChatSaveHandler checking localStorage and DB for metadata...`);
      
      try {
        // Check localStorage first
        const storedMetadata = localStorage.getItem('hume_metadata');
        if (storedMetadata) {
          const parsedMetadata = JSON.parse(storedMetadata);
          console.log(`📦 Found metadata in localStorage:`, parsedMetadata);
          
          if (parsedMetadata.chatId && !storedChatId) {
            console.log(`🔄 Setting chatId from localStorage: ${parsedMetadata.chatId}`);
            setStoredChatId(parsedMetadata.chatId);
          }
          
          if (parsedMetadata.chatGroupId && !storedGroupChatId) {
            console.log(`🔄 Setting chatGroupId from localStorage: ${parsedMetadata.chatGroupId}`);
            setStoredGroupChatId(parsedMetadata.chatGroupId);
          }
        }
        
        // Try to update metadata state from the database if localStorage didn't have it
        if (debugSession?.found && (!storedChatId || !storedGroupChatId)) {
          console.log(`📊 Database session info:`, debugSession);
          
          if (debugSession.chatId && !storedChatId) {
            console.log(`📊 Setting chatId from database: ${debugSession.chatId}`);
            setStoredChatId(debugSession.chatId);
          }
          
          if (debugSession.chatGroupId && !storedGroupChatId) {
            console.log(`📊 Setting chatGroupId from database: ${debugSession.chatGroupId}`);
            setStoredGroupChatId(debugSession.chatGroupId);
          }
        }
      } catch (e) {
        console.error("Error checking metadata sources:", e);
      }
    };
    
    checkDbAndLocalStorage();
    
    // Set up event listener for save requests
    const handleSaveRequest = (event: Event) => {
      console.log("Received save request:", (event as CustomEvent).detail);
      handleSaveChat();
    };
    
    window.addEventListener('saveChat', handleSaveRequest);
    
    return () => {
      window.removeEventListener('saveChat', handleSaveRequest);
    };
  }, [debugSession]);

  // Auto-save chat history when chat ID becomes available and we haven't saved yet
  useEffect(() => {
    if (storedChatId && !hasSavedRef.current) {
      console.log("Auto-saving chat history for chatId:", storedChatId);
      // The SaveChatHistory component will handle the actual saving when it's rendered
    }
  }, [storedChatId]);

  return (
    <div className="space-y-4">
      {storedChatId && (
        <div className="flex flex-col gap-2 mt-4">
          <SaveChatHistory 
            chatId={storedChatId} 
            onSuccess={(result) => {
              console.log("Chat history saved successfully:", result);
              hasSavedRef.current = true;
            }}
            onError={(error) => {
              console.error("Error saving chat history:", error);
            }}
            variant="outline"
            size="sm"
            className="w-full"
          />
          <div className="text-xs text-gray-500 text-center">
            Chat ID: {storedChatId.substring(0, 8)}...
          </div>
        </div>
      )}
      {/* Add a fallback button that triggers handleSaveChat */}
      {(!storedChatId || process.env.NODE_ENV !== 'production') && (
        <button 
          onClick={handleSaveChat} 
          className="w-full bg-gray-100 text-gray-600 hover:bg-gray-200 px-3 py-1 rounded-md text-sm"
        >
          Force Save Chat (Fallback)
        </button>
      )}
    </div>
  );
} 