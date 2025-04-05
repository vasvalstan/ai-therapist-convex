'use client';

import { useState } from 'react';
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface SaveChatHistoryProps {
  chatId: string;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  className?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

export function SaveChatHistory({
  chatId,
  onSuccess,
  onError,
  className,
  variant = "default",
  size = "default"
}: SaveChatHistoryProps) {
  const [isSaving, setIsSaving] = useState(false);
  const saveHistory = useMutation(api.chat.saveHumeChatHistory);

  const handleSaveHistory = async () => {
    if (!chatId) {
      toast.error("No chat ID provided");
      return;
    }

    setIsSaving(true);
    try {
      const result = await saveHistory({ chatId });
      
      if (result.success) {
        toast.success(`Saved ${result.messageCount} messages to chat history`);
        if (onSuccess) onSuccess(result);
      } else {
        toast.error(result.message || "Failed to save chat history");
        if (onError) onError(new Error(result.message || "Failed to save chat history"));
      }
    } catch (error) {
      console.error("Error saving chat history:", error);
      toast.error("Error saving chat history");
      if (onError) onError(error as Error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Button
      onClick={handleSaveHistory}
      disabled={isSaving || !chatId}
      className={className}
      variant={variant}
      size={size}
    >
      {isSaving ? "Saving..." : "Save Chat History"}
    </Button>
  );
} 