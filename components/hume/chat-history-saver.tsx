'use client';

import { useState, useEffect } from 'react';
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ChatHistorySaverProps {
  chatId: string;
  autoSave?: boolean;
  onSaved?: (data: any) => void;
  className?: string;
  showButton?: boolean;
}

/**
 * Component to save Hume chat history to the database
 * Can automatically save when the chat ID becomes available or show a button for manual saving
 */
export function ChatHistorySaver({
  chatId,
  autoSave = false,
  onSaved,
  className = "",
  showButton = true
}: ChatHistorySaverProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
  const saveHistory = useMutation(api.chat.saveHumeChatHistory);

  const saveChatHistory = async () => {
    if (!chatId || isSaving || hasSaved) return;

    setIsSaving(true);
    try {
      const result = await saveHistory({ chatId });
      
      if (result.success) {
        toast.success(`Saved ${result.messageCount} messages to chat history`);
        setHasSaved(true);
        if (onSaved) onSaved(result);
      } else {
        toast.error(result.message || "Failed to save chat history");
      }
    } catch (error) {
      console.error("Error saving chat history:", error);
      toast.error("Error saving chat history");
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-save when chatId becomes available
  useEffect(() => {
    if (autoSave && chatId && !hasSaved) {
      saveChatHistory();
    }
  }, [chatId, autoSave, hasSaved]);

  if (!showButton) return null;
  
  return (
    <Button
      onClick={saveChatHistory}
      disabled={isSaving || hasSaved || !chatId}
      className={className}
      variant="outline"
      size="sm"
    >
      {isSaving ? "Saving..." : hasSaved ? "Chat Saved" : "Save Chat History"}
    </Button>
  );
} 