"use client";

import { Analytics } from "@vercel/analytics/react";
import { ClerkProvider } from "@clerk/nextjs";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { VoiceProvider } from "@humeai/voice-react";
import { ConvexReactClient } from "convex/react";
import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";

// Move client initialization to a client component
function ConvexClientProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => {
    // Make sure we have a valid URL
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "https://vivid-warthog-65.convex.cloud";
    
    // Validate URL format
    try {
      new URL(convexUrl); // This will throw if invalid
      return new ConvexReactClient(convexUrl);
    } catch (error) {
      console.error("Invalid Convex URL:", error);
      // Fallback to hardcoded URL
      return new ConvexReactClient("https://vivid-warthog-65.convex.cloud");
    }
  });

  return (
    <ConvexProviderWithClerk client={client} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  );
}

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
  const configId = process.env.NEXT_PUBLIC_HUME_CONFIG_ID || "3c38e3e5-3b4c-4e9e-80e8-e849f65408c1";

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
  // Ensure the publishable key is properly set
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "pk_test_YWxlcnQta2FuZ2Fyb28tMjEuY2xlcmsuYWNjb3VudHMuZGV2JA";
  
  return (
    <ClerkProvider publishableKey={publishableKey}>
      <ConvexClientProvider>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <VoiceWrapper>
            {children}
          </VoiceWrapper>
          <Toaster />
          <Analytics />
        </ThemeProvider>
      </ConvexClientProvider>
    </ClerkProvider>
  );
} 