import { NextResponse } from "next/server";
import { getHumeAccessToken } from "@/lib/hume";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

// Define types for our messages
interface Message {
    role: string;
    content?: string;
    messageText?: string;
    timestamp: number;
    _creationTime?: number;
}

interface Event {
    type: string;
    role: string;
    messageText?: string;
    content?: string;
    timestamp: number;
}

interface ChatSession {
    found: boolean;
    error?: string;
    foundBy?: string;
    sessionId?: any;
    chatId?: string;
    chatGroupId?: string;
    messages?: Message[];
    events?: Event[];
}

// Create a Convex client
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    
    try {
        const chatId = searchParams.get('chatId');
        console.log("Received request for chatId:", chatId);

        if (!chatId) {
            console.log("No chatId provided");
            return NextResponse.json(
                { error: "Chat ID is required" },
                { status: 400 }
            );
        }

        // First, try to find the chat in our database
        console.log("Looking up chat in Convex...");
        const chatSession = await convex.query(api.chat.lookupByChatIds, { 
            chatId,
            chatGroupId: chatId // Try both as it could be either
        }) as ChatSession;

        console.log("Chat session found:", chatSession);

        if (!chatSession || !chatSession.found || chatSession.error) {
            return NextResponse.json({
                error: "Chat not found in database",
                chatId,
                details: chatSession?.error
            }, { status: 404 });
        }

        // Get the correct Hume IDs from our database
        const humeIds = {
            chatId: chatSession.chatId,
            chatGroupId: chatSession.chatGroupId
        };

        console.log("Using Hume IDs:", humeIds);

        // Get all messages from the chat session
        const allMessages = [];
        
        // Add messages from the messages array
        if (chatSession.messages && Array.isArray(chatSession.messages)) {
            console.log("Adding messages from messages array:", chatSession.messages.length);
            allMessages.push(...chatSession.messages.map((msg: Message) => ({
                role: msg.role === "user" ? "User" : "Assistant",
                message: msg.content?.trim() || msg.messageText?.trim() || "",
                timestamp: msg.timestamp || msg._creationTime || Date.now(),
                source: "messages"
            })));
        }

        // Add messages from the events array
        if (chatSession.events && Array.isArray(chatSession.events)) {
            console.log("Adding messages from events array:", chatSession.events.length);
            const messageEvents = chatSession.events.filter(
                (event: Event) => 
                    (event.type === "USER_MESSAGE" || event.type === "AGENT_MESSAGE") &&
                    (event.messageText || event.content) // Only include events with actual messages
            );
            
            allMessages.push(...messageEvents.map((event: Event) => ({
                role: event.role === "USER" ? "User" : "Assistant",
                message: event.messageText?.trim() || event.content?.trim() || "",
                timestamp: event.timestamp,
                source: "events"
            })));
        }

        // Sort messages by timestamp
        allMessages.sort((a, b) => a.timestamp - b.timestamp);

        console.log("Total messages found:", allMessages.length);

        // Generate transcript lines
        const transcriptLines = allMessages.map(msg => {
            const timestamp = new Date(msg.timestamp).toLocaleString();
            return `[${timestamp}] ${msg.role}: ${msg.message}`;
        });

        // Prepare response
        const response_data = {
            success: true,
            metadata: {
                chatId,
                humeIds,
                totalMessages: allMessages.length,
                messagesFromEvents: chatSession.events?.length || 0,
                messagesFromMessages: chatSession.messages?.length || 0
            },
            transcript: transcriptLines.join("\n"),
            messages: allMessages
        };

        console.log("Sending response:", {
            success: response_data.success,
            metadata: response_data.metadata,
            hasTranscript: !!response_data.transcript,
            messageCount: allMessages.length
        });

        return NextResponse.json(response_data);

    } catch (error) {
        console.error("Error generating transcript:", {
            error,
            chatId: searchParams.get('chatId')
        });
        
        return NextResponse.json(
            { 
                error: error instanceof Error ? error.message : "Failed to generate transcript",
                chatId: searchParams.get('chatId')
            },
            { status: 500 }
        );
    }
} 