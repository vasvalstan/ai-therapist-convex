import Link from "next/link";

// For this example, we'll create a simple page with a link to the specific chat ID
export default async function ChatHistoryPage() {
  // In a real app, you would fetch all available chat sessions here
  // For now, we'll just create a link to the provided chat ID
  const sampleChatId = "07b99e4c-b621-4673-adf4-aa2cae2d6343";

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Chat History</h1>
      
      <div className="bg-white shadow-md rounded-lg p-4 mb-4">
        <h2 className="text-lg font-semibold mb-2">Available Chats</h2>
        <ul className="space-y-2">
          <li>
            <Link 
              href={`/chat-history/${sampleChatId}`}
              className="text-blue-600 hover:underline"
            >
              View Chat: {sampleChatId}
            </Link>
          </li>
          {/* In a real app, you would map through all available chats here */}
        </ul>
      </div>
      
      <div className="bg-gray-50 rounded-lg p-4 mt-6">
        <h3 className="text-lg font-semibold mb-2">How to Use</h3>
        <p className="text-gray-700">
          This page allows you to view chat history for specific conversations. 
          Click on a chat ID to view detailed chat events for that session.
        </p>
      </div>
    </div>
  );
} 