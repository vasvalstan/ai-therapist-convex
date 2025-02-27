import { ConvexHttpClient } from "convex/browser";
import dotenv from "dotenv";
import fs from "fs";

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" });

// Create a client for the production deployment
const client = new ConvexHttpClient("https://decisive-tiger-533.convex.cloud");

// Define a type for chat history
type ChatHistory = {
  _id: string;
  userId: string;
  sessionId: string;
  messages: Array<{
    role: "user" | "assistant";
    content: string;
    timestamp: number;
    emotions?: any;
  }>;
  createdAt: number;
  updatedAt: number;
  title?: string;
};

async function getChatHistory() {
  try {
    // Use the new getAllChatHistory query function
    const allChatHistory = await (client as any).query("chat:getAllChatHistory");
    
    console.log("Chat history from production deployment:");
    console.log(`Found ${allChatHistory.length} chat history records`);
    
    // Check for any undefined values in the messages
    let hasUndefinedValues = false;
    for (const chat of allChatHistory) {
      if (chat.messages) {
        for (let i = 0; i < chat.messages.length; i++) {
          const message = chat.messages[i];
          for (const [key, value] of Object.entries(message)) {
            if (value === undefined) {
              console.log(`Found undefined value in chat ${chat._id}, message ${i}, key ${key}`);
              hasUndefinedValues = true;
            }
          }
        }
      }
    }
    
    if (!hasUndefinedValues) {
      console.log("No undefined values found in chat messages");
    }
    
    // Save to file for reference
    fs.writeFileSync("prod-chat-history.json", JSON.stringify(allChatHistory, null, 2));
    console.log("Chat history saved to prod-chat-history.json");
  } catch (error) {
    console.error("Error fetching chat history:", error);
  }
}

getChatHistory(); 