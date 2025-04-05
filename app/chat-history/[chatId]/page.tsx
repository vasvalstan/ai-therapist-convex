import { fetchChatEvents } from "@/lib/hume";
import { format } from "date-fns";

export const dynamic = 'force-dynamic';

type ChatEvent = {
  type: string;
  role: string;
  messageText: string;
  timestamp: number;
  emotionFeatures?: string;
  chatId: string;
  chatGroupId: string;
};

function formatTimestamp(timestamp: number) {
  return format(new Date(timestamp), "MMM d, yyyy h:mm:ss a");
}

function getEmotionSummary(emotionFeatures?: string) {
  if (!emotionFeatures) return "No emotion data";
  
  try {
    const emotions = JSON.parse(emotionFeatures);
    // Get top 3 emotions
    return Object.entries(emotions)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 3)
      .map(([emotion, value]) => `${emotion}: ${(Number(value) * 100).toFixed(0)}%`)
      .join(", ");
  } catch (e) {
    return "Error parsing emotions";
  }
}

function getEventTypeDisplay(type: string) {
  switch (type) {
    case "USER_MESSAGE": return "User";
    case "AGENT_MESSAGE": return "Assistant";
    case "CHAT_METADATA": return "System";
    case "USER_INTERRUPTION": return "User Interrupted";
    case "TOOL_CALL_MESSAGE": return "Tool Call";
    case "TOOL_RESPONSE_MESSAGE": return "Tool Response";
    case "SESSION_SETTINGS": return "Session Settings";
    case "PAUSE_ASSISTANT_MESSAGE": return "Assistant Paused";
    case "RESUME_ASSISTANT_MESSAGE": return "Assistant Resumed";
    default: return type;
  }
}

export default async function ChatHistory({ params }: { params: { chatId: string } }) {
  const { chatId } = params;
  const events = await fetchChatEvents(chatId);

  if (!events) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Chat History</h1>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Failed to load chat events. Chat ID may be invalid or API key is missing.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Chat History</h1>
      <div className="mb-4">
        <p className="text-gray-600">Chat ID: {chatId}</p>
        {events.length > 0 && (
          <p className="text-gray-600">
            Chat Group ID: {events[0].chatGroupId}
          </p>
        )}
        <p className="text-gray-600">Total Events: {events.length}</p>
      </div>

      <div className="space-y-4">
        {events.map((event: ChatEvent, index: number) => (
          <div 
            key={index}
            className={`p-4 rounded-lg ${
              event.role === "USER" 
                ? "bg-blue-50 border-blue-200" 
                : event.role === "ASSISTANT" 
                ? "bg-green-50 border-green-200"
                : "bg-gray-50 border-gray-200"
            } border`}
          >
            <div className="flex justify-between mb-2">
              <span className="font-semibold">
                {getEventTypeDisplay(event.type)}
              </span>
              <span className="text-sm text-gray-500">
                {formatTimestamp(event.timestamp)}
              </span>
            </div>
            
            <p className="text-gray-800 whitespace-pre-wrap">{event.messageText}</p>
            
            {event.emotionFeatures && (
              <div className="mt-2 text-sm text-gray-600">
                <span className="font-medium">Emotions:</span> {getEmotionSummary(event.emotionFeatures)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
} 