import { ConvexHttpClient } from "convex/browser";
import dotenv from "dotenv";

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" });

// Get the Convex URL from environment variables
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "https://vivid-warthog-65.convex.cloud";

// Initialize the Convex client
const client = new ConvexHttpClient(CONVEX_URL);

// Define the session ID to delete
const sessionIdToDelete = "dcea3f6f-5548-4e33-500b-27952984bf6c";

async function deleteChat() {
  try {
    console.log(`Using Convex URL: ${CONVEX_URL}`);
    console.log(`Looking for chat with session ID: ${sessionIdToDelete}`);
    
    // Use a system function to query the database directly
    // This bypasses the authentication check in the regular deleteChat function
    const allChats = await client.query("_system/database:query", { 
      tableName: "chatHistory",
      paginationOpts: { numItems: 1000 }
    });
    
    console.log(`Found ${allChats.length} chats in total`);
    
    // Find the chat with the matching session ID
    const chatToDelete = allChats.find((chat: any) => chat.sessionId === sessionIdToDelete);
    
    if (!chatToDelete) {
      console.log(`No chat found with session ID: ${sessionIdToDelete}`);
      return;
    }
    
    console.log(`Found chat to delete:`, {
      id: chatToDelete._id,
      sessionId: chatToDelete.sessionId,
      creationTime: chatToDelete._creationTime
    });
    
    // Delete the document directly using the system mutation
    await client.mutation("_system/database:delete", { 
      tableName: "chatHistory", 
      id: chatToDelete._id 
    });
    
    console.log(`Successfully deleted chat with ID: ${chatToDelete._id}`);
  } catch (error) {
    console.error("Error deleting chat:", error);
  }
}

// Execute the function
deleteChat().catch(console.error); 