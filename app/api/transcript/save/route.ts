import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

interface Message {
    role: string;
    content: string;
    timestamp: number;
}

export async function POST(request: Request) {
    try {
        const session = await request.json();

        // Only use messages from the messages array
        const messages = session.messages?.map((msg: any) => ({
            role: msg.role === "USER" || msg.role === "user" ? "User" : "Assistant",
            content: msg.content || msg.messageText || "",
            timestamp: msg.timestamp || msg._creationTime || Date.now()
        })) || [];

        // Sort messages by timestamp
        messages.sort((a: Message, b: Message) => a.timestamp - b.timestamp);

        // Add metadata at the top
        const metadata = [
            `Chat Title: ${session.title || "Untitled Chat"}`,
            `Session ID: ${session._id}`,
            `Generated: ${new Date().toLocaleString()}`,
            "---",
            ""
        ];

        // Generate transcript lines
        const transcriptLines = messages.map((msg: Message) => {
            const timestamp = new Date(msg.timestamp).toLocaleString();
            return `[${timestamp}] ${msg.role}: ${msg.content}`;
        });

        // Join all lines into a single transcript
        const transcript = [...metadata, ...transcriptLines].join("\n");

        // Create transcripts directory if it doesn't exist
        const transcriptsDir = path.join(process.cwd(), "transcripts");
        if (!fs.existsSync(transcriptsDir)) {
            fs.mkdirSync(transcriptsDir, { recursive: true });
        }

        // Generate a filename based on chat title and date
        const sanitizedTitle = (session.title || "untitled")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .slice(0, 50);
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const filename = `${sanitizedTitle}-${timestamp}.txt`;
        const filepath = path.join(transcriptsDir, filename);

        // Save the transcript
        fs.writeFileSync(filepath, transcript, "utf8");

        // Return the transcript content and filename for download
        return NextResponse.json({
            success: true,
            transcript,
            filename,
            metadata: {
                totalMessages: messages.length
            }
        });

    } catch (error) {
        console.error("Error generating transcript:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to generate transcript" },
            { status: 500 }
        );
    }
} 