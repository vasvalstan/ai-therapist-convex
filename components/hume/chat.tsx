"use client";

import { VoiceProvider } from "@humeai/voice-react";
import { Messages } from "./messages";
import { Controls } from "./controls";
import { StartCall } from "./start-call";
import { ComponentRef, useEffect, useRef, useState } from "react";
import { api } from "@/convex/_generated/api";
import { useMutation } from "convex/react";

interface HumeChatProps {
  accessToken: string;
  sessionId?: string;
}

export default function HumeChat({ accessToken, sessionId: initialSessionId }: HumeChatProps) {
  const timeout = useRef<number | null>(null);
  const ref = useRef<ComponentRef<typeof Messages> | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(initialSessionId ?? null);

  const createSession = useMutation(api.chat.createChatSession);
  const addMessage = useMutation(api.chat.addMessageToSession);

  useEffect(() => {
    if (!currentSessionId) {
      createSession({}).then((result) => {
        if (result?.sessionId) {
          setCurrentSessionId(result.sessionId);
        }
      });
    }
  }, [currentSessionId, createSession]);

  if (!currentSessionId) {
    return <div>Loading...</div>;
  }

  const handleMessage = (message: any) => {
    if (timeout.current) {
      window.clearTimeout(timeout.current);
    }

    // Store the message in the database
    if (message.type === "user_message" || message.type === "assistant_message") {
      addMessage({
        sessionId: currentSessionId,
        message: {
          role: message.type === "user_message" ? "user" : "assistant",
          content: message.message.content,
          emotions: message.models.prosody?.scores,
        },
      });
    }

    timeout.current = window.setTimeout(() => {
      if (ref.current) {
        const scrollHeight = ref.current.scrollHeight;
        ref.current.scrollTo({
          top: scrollHeight,
          behavior: "smooth",
        });
      }
    }, 200);
  };

  return (
    <div className="relative flex-1 flex flex-col mx-auto w-full overflow-hidden">
      <VoiceProvider
        auth={{ type: "accessToken", value: accessToken }}
        configId={process.env.NEXT_PUBLIC_HUME_CONFIG_ID}
        onMessage={handleMessage}
      >
        <Messages ref={ref} />
        <Controls />
        <StartCall />
      </VoiceProvider>
    </div>
  );
} 