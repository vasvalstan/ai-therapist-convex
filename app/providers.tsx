"use client";

import { Analytics } from "@vercel/analytics/react";
import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { VoiceProvider } from "@humeai/voice-react";
import { ConvexReactClient } from "convex/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

// Initialize Convex client outside of component
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!convexUrl) {
  throw new Error("Missing NEXT_PUBLIC_CONVEX_URL environment variable");
}

const convex = new ConvexReactClient(convexUrl);

export function VoiceWrapper({ children }: { children: React.ReactNode }) {
  const configId = process.env.NEXT_PUBLIC_HUME_CONFIG_ID || "fallback_config_id";
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    const fetchToken = async () => {
      try {
        console.log("🔑 Fetching Hume access token...");
        // Fetch Hume access token from our API endpoint
        const response = await fetch('/api/hume/token');
        const data = await response.json();
        console.log("✅ Successfully retrieved Hume access token");
        setAccessToken(data.accessToken);
      } catch (error) {
        console.error("❌ Failed to get Hume access token:", error);
        toast("Failed to get voice access token. Please try again.");
      }
    };
    fetchToken();
  }, []);

  useEffect(() => {
    const handleEvent = (event: any) => {
      console.log("Received Hume event:", event.detail);
      const data = event.detail || {};
      
      // Check if the message type is chat_metadata
      if (data.type === "chat_metadata") {
        console.log("📦 Received chat metadata from Hume:", data);
        
        // Check that we have the required fields
        if (data.chatId && data.chatGroupId) {
          // Store the metadata in localStorage for cross-component access
          try {
            const metadataToStore = {
              chatId: data.chatId,
              chatGroupId: data.chatGroupId,
              requestId: data.requestId || crypto.randomUUID(),
              timestamp: new Date().toISOString()
            };
            
            localStorage.setItem('hume_metadata', JSON.stringify(metadataToStore));
            console.log("✅ Stored Hume metadata in localStorage:", metadataToStore);
          } catch (e) {
            console.error("Error storing metadata in localStorage:", e);
          }
        } else {
          console.warn("⚠️ Received chat metadata but missing required fields:", data);
        }
      }
      
      setMessages(prev => [...prev, data]);
    };

    window.addEventListener("hume:message", handleEvent);

    return () => {
      window.removeEventListener("hume:message", handleEvent);
    };
  }, []);

  if (!accessToken) {
    return children;
  }

  return (
    <VoiceProvider
      auth={{ type: "accessToken", value: accessToken }}
      configId={configId}
      debug={false}
      onMessage={(message) => {
        console.log("🎤 VoiceProvider received raw message:", message);
        
        // Log specific message types
        if (message.type === "chat_metadata") {
          console.log("📋 VoiceProvider received metadata:", {
            chatId: message.chatId,
            chatGroupId: message.chatGroupId,
            requestId: message.requestId
          });
          
          console.log("📋 FULL metadata object:", JSON.stringify(message, null, 2));
          
          // Make sure we have the required fields
          if (!message.chatId || !message.chatGroupId) {
            console.warn("⚠️ Missing critical metadata fields:", {
              hasChatId: !!message.chatId,
              hasGroupChatId: !!message.chatGroupId
            });
          } else {
            // Store in localStorage for cross-component access
            try {
              const metadataForStorage = {
                chatId: message.chatId,
                chatGroupId: message.chatGroupId,
                requestId: message.requestId || crypto.randomUUID(),
                timestamp: new Date().toISOString()
              };
              localStorage.setItem('hume_metadata', JSON.stringify(metadataForStorage));
              console.log("💾 Stored metadata in localStorage:", metadataForStorage);
            } catch (e) {
              console.error("Failed to store metadata in localStorage:", e);
            }
          }
          
          // Add debug info to the message and ensure field names are consistent
          const enhancedMessage = {
            ...message,
            type: "chat_metadata", // Ensure consistent casing
            chatId: message.chatId, // Ensure these fields are included explicitly
            chatGroupId: message.chatGroupId,
            requestId: message.requestId || crypto.randomUUID(),
            _source: "VoiceProvider",
            _timestamp: new Date().toISOString(),
            _debug: true
          };
          
          console.log("🔄 Dispatching enhanced hume:message event for chat_metadata with IDs:", {
            chatId: enhancedMessage.chatId,
            chatGroupId: enhancedMessage.chatGroupId
          });
          
          window.dispatchEvent(new CustomEvent("hume:message", { detail: enhancedMessage }));
          console.log("📢 Dispatched enhanced hume:message event");
        } else if (message.type === "user_message" || message.type === "assistant_message") {
          console.log(`🗣️ VoiceProvider received ${message.type}:`, {
            role: message.message?.role,
            content: message.message?.content,
            emotions: message.models?.prosody?.scores
          });
          
          // Dispatch a custom event with the message data
          window.dispatchEvent(new CustomEvent("hume:message", { detail: message }));
          console.log("📢 Dispatched hume:message event");
        } else {
          // Dispatch other message types as is
          window.dispatchEvent(new CustomEvent("hume:message", { detail: message }));
          console.log("📢 Dispatched hume:message event for type:", message.type);
        }
      }}
    >
      {children}
    </VoiceProvider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <VoiceWrapper>
            {children}
          </VoiceWrapper>
          <Toaster />
          <Analytics />
        </ThemeProvider>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
} 