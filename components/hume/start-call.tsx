"use client";

import { useVoice } from "@humeai/voice-react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { History, MessageCircle, Video, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "@/components/ui/use-toast";
import { useHume } from "./HumeProvider";

interface StartCallProps {
  sessionId?: string;
}

export function StartCall({ sessionId }: StartCallProps) {
  const { status, connect } = useVoice();
  const router = useRouter();
  const pathname = usePathname();
  const { isFaceTrackingEnabled, toggleFaceTracking } = useHume();
  
  // Check if we're already on the chat history page
  const isOnChatHistory = pathname === "/chat/history";
  
  // Don't show overlay if we're viewing a specific session
  const hasSessionId = !!sessionId;

  return (
    <AnimatePresence>
      {status.value !== "connected" && !hasSessionId ? (
        <motion.div
          className="fixed inset-0 p-4 flex items-center justify-center bg-background"
          initial="initial"
          animate="enter"
          exit="exit"
          variants={{
            initial: { opacity: 0 },
            enter: { opacity: 1 },
            exit: { opacity: 0 },
          }}
        >
          <motion.div
            className="flex flex-col gap-4 items-center"
            variants={{
              initial: { scale: 0.5 },
              enter: { scale: 1 },
              exit: { scale: 0.5 },
            }}
          >
            <div className="flex flex-col gap-3 items-center">
              <Button
                className="flex items-center gap-1.5"
                onClick={async () => {
                  try {
                    console.log("Starting voice connection...");
                    await connect();
                    console.log("Voice connection established");
                  } catch (error) {
                    console.error("Failed to connect:", error);
                    // Show error toast
                    const errorMessage = error instanceof Error ? error.message : "Failed to connect";
                    toast({
                      title: "Connection Error",
                      description: errorMessage,
                      variant: "destructive",
                    });
                  }
                }}
              >
                <span>
                  <MessageCircle
                    className="size-4 opacity-50"
                    strokeWidth={2}
                    stroke="currentColor"
                  />
                </span>
                <span>Start conversation</span>
              </Button>
              
              <Button
                variant={isFaceTrackingEnabled ? "default" : "outline"}
                className="flex items-center gap-1.5"
                onClick={toggleFaceTracking}
              >
                <span>
                  <Video
                    className="size-4 opacity-50"
                    strokeWidth={2}
                    stroke="currentColor"
                  />
                </span>
                <span>{isFaceTrackingEnabled ? "Disable video" : "Enable video"}</span>
              </Button>
            </div>

            {isOnChatHistory ? (
              // If already on chat history, show a close button
              <Button 
                variant="outline" 
                className="flex items-center gap-1.5"
                onClick={() => {
                  // Simulate a connect action to close the overlay
                  connect()
                    .then(() => {})
                    .catch(() => {})
                    .finally(() => {});
                }}
              >
                <span>
                  <X
                    className="size-4 opacity-50"
                    strokeWidth={2}
                    stroke="currentColor"
                  />
                </span>
                <span>Close</span>
              </Button>
            ) : (
              // If not on chat history, show the go to chat history button
              <Button 
                variant="outline" 
                className="flex items-center gap-1.5"
                onClick={() => router.push("/chat/history")}
              >
                <span>
                  <History
                    className="size-4 opacity-50"
                    strokeWidth={2}
                    stroke="currentColor"
                  />
                </span>
                <span>Go to chat history</span>
              </Button>
            )}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}