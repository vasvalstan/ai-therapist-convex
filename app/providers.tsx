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

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

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

  return (
    <VoiceProvider
      auth={{ type: "accessToken", value: accessToken }}
      configId={process.env.NEXT_PUBLIC_HUME_CONFIG_ID}
    >
      {children}
    </VoiceProvider>
  );
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
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
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
} 