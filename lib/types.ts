export interface ChatSession {
  userId: string;
  chatId: string;
  chatGroupId: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  title?: string;
}

export interface Message {
  type: "USER_MESSAGE" | "AGENT_MESSAGE" | "TOOL_CALL_MESSAGE" | "TOOL_RESPONSE_MESSAGE" | "CHAT_METADATA";
  role: "USER" | "ASSISTANT" | "SYSTEM";
  content: string;
  timestamp: number;
  emotionFeatures?: any;
  chatId?: string;
  chatGroupId?: string;
  metadata?: {
    chat_id: string;
    chat_group_id: string;
    request_id: string;
    timestamp: string;
  };
}