import { NextRequest, NextResponse } from "next/server";

/**
 * API endpoint to retrieve Hume chat metadata from localStorage on the client
 * This helps bridge the gap between client-side metadata and server-side components
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { chatId, chatGroupId } = body;
    
    if (!chatId) {
      return NextResponse.json({ error: "Missing chat ID" }, { status: 400 });
    }
    
    // Store this data so it can be used for chat history fetching
    return NextResponse.json({
      success: true,
      chatId,
      chatGroupId: chatGroupId || chatId
    });
  } catch (error: any) {
    console.error("Error processing metadata:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
} 