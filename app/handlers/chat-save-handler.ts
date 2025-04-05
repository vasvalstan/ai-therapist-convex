import { api } from "@/convex/_generated/api";
import { useMutation, useAction } from "convex/react";

/**
 * Helper to save chat history that handles errors gracefully
 * Can be used from voice-controller.tsx or any component
 */
export const useSaveHumeChat = () => {
  // Use a direct API call instead of Convex to avoid the fetch() issue
  // We're bypassing Convex's fetch limitations by using browser fetch directly
  
  const saveChat = async (chatId: string, chatGroupId?: string) => {
    if (!chatId) {
      throw new Error("Missing chat ID");
    }

    try {
      console.log(`Saving Hume chat with ID: ${chatId}`);
      
      // Use the session-lookup API endpoint which doesn't have the fetch() limitation
      const lookupResponse = await fetch(
        `/api/session-lookup?chatId=${chatId}&chatGroupId=${chatGroupId || chatId}&save=true`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Even if the response is not OK, try to parse the JSON for error details
      const result = await lookupResponse.json();
      
      if (!lookupResponse.ok) {
        const errorDetails = result?.details || result?.error || lookupResponse.statusText;
        console.error(`Failed to save chat: ${lookupResponse.status}`, errorDetails);
        throw new Error(`Failed to save chat: ${errorDetails}`);
      }
      
      if (result.success) {
        console.log("Chat saved successfully:", result);
        return {
          success: true,
          messageCount: result.messageCount || 0,
          sessionId: result.sessionId,
          chatId: result.chatId || chatId,
        };
      } else {
        const errorMessage = result.details || result.message || "Unknown error";
        console.error("Failed to save chat:", errorMessage);
        throw new Error(errorMessage || "Failed to save chat");
      }
    } catch (error) {
      console.error("Error saving chat:", error);
      throw error;
    }
  };

  return { saveChat };
}; 