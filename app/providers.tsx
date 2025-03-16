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
    // Hardcoded fallback URL - this is guaranteed to be valid
    const fallbackUrl = "https://vivid-warthog-65.convex.cloud";
    
    // Try to get the URL from environment variables
    let convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || '';
    
    // If the URL is not defined or empty, use the fallback
    if (!convexUrl || convexUrl.trim() === '') {
      console.warn("NEXT_PUBLIC_CONVEX_URL is not defined, using fallback URL");
      convexUrl = fallbackUrl;
    }
    
    // Ensure the URL has a protocol
    if (!convexUrl.startsWith('http://') && !convexUrl.startsWith('https://')) {
      console.warn("NEXT_PUBLIC_CONVEX_URL does not have a protocol, adding https://");
      convexUrl = 'https://' + convexUrl;
    }
    
    try {
      // Final validation
      new URL(convexUrl);
      console.log("Using Convex URL:", convexUrl);
      return new ConvexReactClient(convexUrl);
    } catch (error) {
      console.error("Invalid Convex URL:", error);
      // If all else fails, use the hardcoded fallback
      console.log("Falling back to hardcoded URL:", fallbackUrl);
      return new ConvexReactClient(fallbackUrl);
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
  // Ensure the publishable key is properly set
  const fallbackKey = "pk_test_YWxlcnQta2FuZ2Fyb28tMjEuY2xlcmsuYWNjb3VudHMuZGV2JA";
  
  // Try to get the key from environment variables
  let publishableKey = typeof process !== 'undefined' && 
                      process.env && 
                      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  
  // If the key is not defined or empty, use the fallback
  if (!publishableKey || publishableKey.trim() === '') {
    console.warn("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is not defined, using fallback key");
    publishableKey = fallbackKey;
  }
  
  // Ensure we have a valid publishable key
  if (!publishableKey) {
    console.error("No valid Clerk publishable key available");
    // Provide a fallback UI when no key is available
    return (
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        {children}
        <Toaster />
        <Analytics />
      </ThemeProvider>
    );
  }
  
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