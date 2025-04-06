// Types for chat messages and sessions
interface Message {
    role: string;
    content?: string;
    messageText?: string;
    timestamp: number;
    _creationTime?: number;
}

interface ChatSession {
    _id: string;
    messages?: Message[];
    title?: string;
    updatedAt: number;
}

/**
 * Generates a transcript from a chat session and triggers a download in the browser
 */
export async function generateAndDownloadTranscript(session: ChatSession): Promise<void> {
    try {
        // Call the API to generate the transcript
        const response = await fetch("/api/transcript/save", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(session),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || "Failed to generate transcript");
        }

        const data = await response.json();

        // Create a blob from the transcript
        const blob = new Blob([data.transcript], { type: "text/plain" });
        const url = window.URL.createObjectURL(blob);

        // Create a temporary link and trigger download
        const link = document.createElement("a");
        link.href = url;
        link.download = data.filename;
        document.body.appendChild(link);
        link.click();

        // Cleanup
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

    } catch (error) {
        console.error("Error generating transcript:", error);
        throw error;
    }
} 