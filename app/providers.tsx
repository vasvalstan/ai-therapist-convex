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
import dynamic from "next/dynamic";
import { HumeProvider } from "@/components/hume/HumeProvider";

// Initialize Convex client outside of component
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!convexUrl) {
  throw new Error("Missing NEXT_PUBLIC_CONVEX_URL environment variable");
}

const convex = new ConvexReactClient(convexUrl);

// Split into separate components for better hydration
function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}

// Wrap AuthProvider in a client-only component
const DynamicAuthProvider = dynamic(() => Promise.resolve(AuthProvider), {
  ssr: false,
  loading: () => <div>Loading auth...</div>
});

export function VoiceWrapper({ children }: { children: React.ReactNode }) {
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
        // Store token for components that need it
        if (typeof window !== 'undefined') {
          localStorage.setItem('hume_access_token', data.accessToken);
        }
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
    };

    window.addEventListener("hume:message", handleEvent);

    return () => {
      window.removeEventListener("hume:message", handleEvent);
    };
  }, []);

  if (!accessToken) {
    // Return children without VoiceProvider while loading
    return <>{children}</>;
  }

  return (
    <VoiceProvider
      onMessage={(message) => {
        // Simplified message handling like the working quickstart
        console.log("🎤 VoiceProvider message:", message.type);
        
        // Store chat metadata for session tracking
        if (message.type === "chat_metadata") {
          try {
            const metadataForStorage = {
              chatId: message.chatId,
              chatGroupId: message.chatGroupId,
              requestId: message.requestId || crypto.randomUUID(),
              timestamp: new Date().toISOString()
            };
            localStorage.setItem('hume_metadata', JSON.stringify(metadataForStorage));
            console.log("💾 Stored metadata:", metadataForStorage);
          } catch (e) {
            console.error("Failed to store metadata:", e);
          }
        }
        
        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent("hume:message", { detail: message }));
      }}
    >
      {children}
    </VoiceProvider>
  );
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <DynamicAuthProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem
        disableTransitionOnChange
      >
        <HumeProvider>
          <VoiceWrapper>
            {children}
          </VoiceWrapper>
        </HumeProvider>
        <Toaster />
        <Analytics />
      </ThemeProvider>
    </DynamicAuthProvider>
  );
}