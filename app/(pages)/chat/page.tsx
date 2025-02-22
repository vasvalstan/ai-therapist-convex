"use client";

import HumeChat from "@/components/hume/chat";
import { useEffect, useState } from "react";

export default function ChatPage() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const response = await fetch("/api/hume/token");
        const data = await response.json();

        if (data.error) {
          setError(data.error);
          return;
        }

        setAccessToken(data.accessToken);
      } catch (err) {
        setError("Failed to get Hume access token");
        console.error("Error fetching Hume token:", err);
      }
    };

    fetchToken();
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  if (!accessToken) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <HumeChat accessToken={accessToken} />
    </div>
  );
} 