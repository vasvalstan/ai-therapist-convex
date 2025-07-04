"use client";

import { useVoice } from "@humeai/voice-react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { History, MessageCircle, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "@/components/ui/use-toast";

interface StartCallProps {
  sessionId?: string;
}

export function StartCall({ sessionId }: StartCallProps) {
  const { status, connect } = useVoice();
  const router = useRouter();
  const pathname = usePathname();

  
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

            </div>

            {isOnChatHistory ? (
              // If already on chat history, show a close button
              <Button 
                variant="outline" 
                className="flex items-center gap-1.5"
                onClick={() => {
                  // Simulate a connect action to close the overlay
                  connect().catch(error => {
                    console.error("Failed to connect:", error);
                  });
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
              // Otherwise, show a button to navigate to chat history
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
                <span>View chat history</span>
              </Button>
            )}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}