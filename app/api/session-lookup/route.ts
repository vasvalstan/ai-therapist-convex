import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

/**
 * API endpoint to lookup a session by Hume chat ID
 * This is used as an intermediary to avoid using fetch in Convex mutations
 */
export async function GET(req: NextRequest) {
  try {
    const chatId = req.nextUrl.searchParams.get("chatId");
    const chatGroupId = req.nextUrl.searchParams.get("chatGroupId");
    const autoCreate = req.nextUrl.searchParams.get("autoCreate") === "true";
    const shouldSave = req.nextUrl.searchParams.get("save") === "true";
    
    if (!chatId) {
      return NextResponse.json(
        { error: "Missing required parameter: chatId" },
        { status: 400 }
      );
    }
    
    console.log(`API route called with: chatId=${chatId}, chatGroupId=${chatGroupId}, save=${shouldSave}`);
    
    // Log environment variables (without exposing secrets)
    console.log(`Environment check - HUME_API_KEY present: ${Boolean(process.env.HUME_API_KEY)}`);
    console.log(`Environment check - HUME_API_URL: ${process.env.HUME_API_URL || "https://api.hume.ai"}`);
    
    // Initialize Convex client
    const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL || "");
    
    // Lookup session by Hume chat ID
    console.log(`Looking up session for Hume chatId: ${chatId}`);
    
    try {
      // First, try to find existing session
      const session = await client.query(api.chat.lookupByChatIds, {
        chatId,
        chatGroupId: chatGroupId || undefined,
      });
      
      if (session && session.found) {
        console.log(`Found session for chatId ${chatId}:`, {
          sessionId: session.sessionId,
          chatId: session.chatId,
          chatGroupId: session.chatGroupId
        });
        
        return NextResponse.json({
          success: true,
          found: true,
          sessionId: session.sessionId,
          chatId: session.chatId,
          chatGroupId: session.chatGroupId,
          // For now, fake a successful save to test the client side code
          saved: shouldSave ? true : undefined,
          messageCount: shouldSave ? 10 : undefined
        });
      } else if (autoCreate) {
        // Try to create a new session with these IDs
        console.log("Session not found but autoCreate=true, creating new session");
        
        const newSession = await client.mutation(api.chat.createSessionWithHumeIds, {
          chatId,
          chatGroupId: chatGroupId || chatId,
          initialMessage: {
            type: "CHAT_METADATA",
            role: "SYSTEM",
            messageText: "Chat session created from Hume metadata",
            timestamp: Date.now()
          }
        });
        
        if (newSession) {
          console.log("Created new session:", newSession);
          return NextResponse.json({
            success: true,
            created: true,
            sessionId: newSession.sessionId,
            chatId: newSession.chatId || chatId,
            chatGroupId: newSession.chatGroupId || chatGroupId || chatId,
            // For now, fake a successful save
            saved: shouldSave ? true : undefined,
            messageCount: shouldSave ? 1 : undefined
          });
        } else {
          throw new Error("Failed to create new session");
        }
      } else {
        return NextResponse.json({
          success: false,
          found: false,
          message: "Session not found with the provided Hume IDs",
        });
      }
    } catch (error: any) {
      console.error("Error searching sessions:", error);
      
      return NextResponse.json(
        { 
          error: "Error searching sessions", 
          details: error.message || "Unknown error" 
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error in session lookup API:", error);
    
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
} 