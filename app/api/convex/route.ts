import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from "convex/browser";

// Function to get chat metadata
export async function GET(req: NextRequest) {
  try {
    // Get the session ID from the query parameters
    const sessionId = req.nextUrl.searchParams.get("sessionId");
    
    if (!sessionId) {
      return NextResponse.json({ error: "Missing session ID" }, { status: 400 });
    }

    // Create a client for the current deployment
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      return NextResponse.json({
        error: "NEXT_PUBLIC_CONVEX_URL is not configured"
      }, { status: 500 });
    }
    
    console.log(`API endpoint querying Convex for session: ${sessionId}`);
    const client = new ConvexHttpClient(convexUrl);
    
    // Call the debug function to get session data using the proper format with any casting
    // The ConvexHttpClient allows for string-based function names with proper type casting
    const sessionData = await (client as any).query("chat:debugGetChatSession", { sessionId });
    
    console.log("Convex session query result:", sessionData);
    
    // Extract the relevant fields
    return NextResponse.json({
      success: true,
      sessionId,
      found: sessionData.found,
      foundBy: sessionData.foundBy,
      chatId: sessionData.chatId,
      chatGroupId: sessionData.chatGroupId,
      // Include the full data for debugging
      fullData: sessionData
    });
  } catch (error) {
    console.error("Error querying Convex:", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
} 