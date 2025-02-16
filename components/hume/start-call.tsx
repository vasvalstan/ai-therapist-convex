"use client";

import { useVoice } from "@humeai/voice-react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { History, MessageCircle } from "lucide-react";
import Link from "next/link";

export function StartCall() {
  const { status, connect } = useVoice();

  return (
    <AnimatePresence>
      {status.value !== "connected" ? (
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
            <Button
              className="flex items-center gap-1.5"
              onClick={() => {
                connect()
                  .then(() => {})
                  .catch(() => {})
                  .finally(() => {});
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

            <Link href="/chat/history">
              <Button variant="outline" className="flex items-center gap-1.5">
                <span>
                  <History
                    className="size-4 opacity-50"
                    strokeWidth={2}
                    stroke="currentColor"
                  />
                </span>
                <span>Go to chat history</span>
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
} 