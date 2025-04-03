import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { NextResponse } from "next/server";

// Create a Convex client for querying outside React components
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!convexUrl) {
  throw new Error("Missing NEXT_PUBLIC_CONVEX_URL environment variable");
}
const convex = new ConvexHttpClient(convexUrl);

export async function GET(request: Request) {
  try {
    // Get the query parameters
    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get("chatId");
    const chatGroupId = searchParams.get("chatGroupId");
    const autoCreate = searchParams.get("autoCreate") !== "false"; // Default to true

    if (!chatId && !chatGroupId) {
      return NextResponse.json(
        { error: "Missing required parameters: chatId or chatGroupId" },
        { status: 400 }
      );
    }

    console.log(`API: Looking up session by chatId=${chatId}, chatGroupId=${chatGroupId}`);

    // Query the database using the lookupByChatIds API
    const result = await convex.query(api.chat.lookupByChatIds, {
      chatId: chatId || undefined,
      chatGroupId: chatGroupId || undefined,
    });

    console.log("API: Lookup result:", result);

    if (result.found) {
      return NextResponse.json({
        success: true,
        found: true,
        sessionId: result.sessionId,
        chatId: result.chatId,
        chatGroupId: result.chatGroupId,
      });
    } else if (autoCreate && chatId && chatGroupId) {
      console.log("API: Session not found. Attempting to create a new session with these IDs");
      
      try {
        // Create a new session with the provided chatId and chatGroupId
        const createResult = await convex.mutation(api.chat.createSessionWithHumeIds, {
          chatId,
          chatGroupId,
          initialMessage: {
            type: "CHAT_METADATA",
            role: "SYSTEM",
            messageText: "Chat session created from Hume metadata",
            timestamp: Date.now()
          }
        });
        
        console.log("API: Created new session:", createResult);
        
        return NextResponse.json({
          success: true,
          found: false,
          created: true,
          sessionId: createResult.sessionId,
          chatId,
          chatGroupId,
          message: "Created new session with provided IDs"
        });
      } catch (createError) {
        console.error("API: Failed to create session:", createError);
        
        return NextResponse.json(
          { 
            success: false, 
            found: false,
            created: false,
            error: "Failed to create session",
            details: String(createError)
          },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json(
        { success: false, found: false, error: "Session not found" },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("Error in session-lookup API:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
} 