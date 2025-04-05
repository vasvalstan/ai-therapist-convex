'use client';

import { useState, useEffect } from 'react';
import { ChatHistorySaver } from '@/components/hume/chat-history-saver';

interface ChatHistoryButtonProps {
  sessionId: string;
}

/**
 * Component that loads Hume chat ID from localStorage and provides
 * an interface to save the chat history
 */
export function ChatHistoryButton({ sessionId }: ChatHistoryButtonProps) {
  const [chatId, setChatId] = useState<string | null>(null);
  
  // Try to load Hume chat ID from localStorage
  useEffect(() => {
    try {
      const storedMetadata = localStorage.getItem('hume_metadata');
      if (storedMetadata) {
        const parsedMetadata = JSON.parse(storedMetadata);
        if (parsedMetadata.chatId) {
          console.log(`Found Hume chat ID in localStorage: ${parsedMetadata.chatId}`);
          setChatId(parsedMetadata.chatId);
        }
      }
    } catch (e) {
      console.error("Error reading Hume metadata from localStorage:", e);
    }
  }, []);

  // If we don't have a Hume chat ID, fallback to the session ID
  const effectiveChatId = chatId || sessionId;
  
  const handleChatSaved = (result: any) => {
    console.log("Chat history saved successfully:", result);
    // You can update UI or perform additional actions here
  };

  return (
    <div className="flex flex-col items-center mt-4">
      <ChatHistorySaver 
        chatId={effectiveChatId}
        onSaved={handleChatSaved}
        className="w-full max-w-xs"
        showButton={true}
        autoSave={false}
      />
      <p className="text-xs text-gray-500 mt-1">
        {chatId ? `Using Hume Chat ID: ${chatId.substring(0, 8)}...` : `Using Session ID: ${sessionId.substring(0, 8)}...`}
      </p>
    </div>
  );
} 