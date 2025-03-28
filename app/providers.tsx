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

function VoiceWrapper({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const { isSignedIn } = useAuth();

  useEffect(() => {
    const getToken = async () => {
      try {
        const response = await fetch("/api/hume/token");
        const data = await response.json();
        setAccessToken(data.accessToken);
      } catch (error) {
        console.error("Failed to get Hume access token:", error);
        toast.error("Failed to initialize voice features. Please try refreshing.");
      }
    };

    if (isSignedIn) {
      getToken();
    }
  }, [isSignedIn]);

  if (!accessToken) {
    return children;
  }

  // Ensure the configId is properly set
  const fallbackConfigId = "3c38e3e5-3b4c-4e9e-80e8-e849f65408c1";
  
  // Try to get the config ID from environment variables
  let configId = typeof process !== 'undefined' && 
                process.env && 
                process.env.NEXT_PUBLIC_HUME_CONFIG_ID;
  
  // If the config ID is not defined or empty, use the fallback
  if (!configId || configId.trim() === '') {
    console.warn("NEXT_PUBLIC_HUME_CONFIG_ID is not defined, using fallback config ID");
    configId = fallbackConfigId;
  }

  return (
    <VoiceProvider
      auth={{ type: "accessToken", value: accessToken }}
      configId={configId}
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