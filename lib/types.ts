export interface ChatSession {
  userId: string;
  chatId: string;
  chatGroupId: string;
  events: Array<{
    type: "USER_MESSAGE" | "AGENT_MESSAGE" | "SYSTEM_MESSAGE";
    role: "USER" | "ASSISTANT" | "SYSTEM";
    messageText: string;
    timestamp: number;
    emotionFeatures?: string;
    chatId: string;
    chatGroupId: string;
  }>;
  createdAt: number;
  updatedAt: number;
  title?: string;
} 