"use client";

import { Analytics } from "@vercel/analytics/react";
import { ClerkProvider } from "@clerk/nextjs";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { VoiceProvider } from "@humeai/voice-react";
import { ConvexReactClient } from "convex/react";
import { useAuth } from "@clerk/nextjs";
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
        toast({
          title: "Error",
          description: "Failed to get voice access token. Please try again."
        });
      }
    };
    fetchToken();
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
          
          // Add debug info to the message
          const enhancedMessage = {
            ...message,
            _source: "VoiceProvider",
            _timestamp: new Date().toISOString(),
            _debug: true
          };
          
          console.log("🔄 Dispatching enhanced hume:message event for chat_metadata");
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

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider appearance={{ baseTheme: undefined }}>
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