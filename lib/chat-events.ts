import "server-only";

type ChatEvent = {
  type: string;
  role: string;
  messageText: string;
  content?: string;
  timestamp: number;
  emotionFeatures?: string;
  chatId: string;
  chatGroupId: string;
  metadata?: {
    chat_id: string;
    chat_group_id: string;
    request_id: string;
    timestamp: string;
  };
};

/**
 * Fetches conversation messages between user and assistant from Hume API
 * @param chatId The ID of the chat to fetch events for
 * @returns Array of user_message and assistant_message events, or null if there was an error
 */
export async function fetchConversationMessages(chatId: string): Promise<ChatEvent[] | null> {
  try {
    // API key must be present in environment variables
    const humeApiKey = process.env.HUME_API_KEY;
    if (!humeApiKey) {
      console.error("Missing HUME_API_KEY environment variable");
      return null;
    }

    // Fetch chat events from Hume API
    console.log(`Fetching chat events for chat ID: ${chatId}`);
    const response = await fetch(
      `https://api.hume.ai/v0/evi/chats/${chatId}/events`,
      {
        method: 'POST', // Using POST as per the documentation
        headers: {
          "Content-Type": "application/json",
          "X-Hume-Api-Key": humeApiKey,
        },
        body: JSON.stringify({}), // Empty body for POST request
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error fetching chat events: ${response.status} - ${errorText}`);
      return null;
    }

    const data = await response.json();
    
    if (!data.events || !Array.isArray(data.events)) {
      console.error("Invalid response format from Hume API, missing events array");
      return null;
    }

    // Filter for user_message and assistant_message events only
    const conversationEvents = data.events.filter((event: ChatEvent) => 
      event.type === "USER_MESSAGE" || 
      event.type === "AGENT_MESSAGE" || 
      event.type === "ASSISTANT_MESSAGE"
    );

    // Sort events by timestamp
    conversationEvents.sort((a: ChatEvent, b: ChatEvent) => a.timestamp - b.timestamp);

    console.log(`Found ${conversationEvents.length} conversation messages`);
    return conversationEvents;
  } catch (error) {
    console.error("Error fetching conversation messages:", error);
    return null;
  }
}

/**
 * Converts Hume chat events to a format suitable for saving in a database
 * @param events Array of chat events
 * @returns Formatted messages for database storage
 */
export function formatMessagesForStorage(events: ChatEvent[]) {
  return events.map(event => ({
    type: event.type,
    role: event.role,
    content: event.messageText || event.content,
    timestamp: event.timestamp,
    emotionFeatures: event.emotionFeatures,
    chatId: event.chatId,
    chatGroupId: event.chatGroupId,
    metadata: event.metadata || {
      chat_id: event.chatId,
      chat_group_id: event.chatGroupId,
      request_id: crypto.randomUUID(),
      timestamp: new Date(event.timestamp).toISOString()
    }
  }));
} 