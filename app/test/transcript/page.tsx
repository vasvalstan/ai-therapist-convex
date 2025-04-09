"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

// Add dynamic configuration
export const dynamic = "force-dynamic";

export default function TestTranscriptPage() {
    const [chatId, setChatId] = useState("");
    const [transcript, setTranscript] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [debug, setDebug] = useState<any>(null);

    const handleGenerateTranscript = async () => {
        if (!chatId.trim()) {
            setError("Please enter a Chat ID");
            return;
        }

        setLoading(true);
        setError("");
        setDebug(null);
        
        try {
            console.log("Fetching transcript for chatId:", chatId);
            const response = await fetch(`/api/transcript?chatId=${encodeURIComponent(chatId)}`);
            console.log("Response status:", response.status);
            
            const data = await response.json();
            console.log("Response data:", data);

            if (!response.ok) {
                throw new Error(data.error || "Failed to generate transcript");
            }

            if (!data.transcript) {
                setError("No transcript data received");
                setDebug(data);
                return;
            }

            setTranscript(data.transcript);
            setDebug({
                metadata: data.metadata,
                messageCount: data.messages?.length
            });
        } catch (err) {
            console.error("Error in transcript generation:", err);
            setError(err instanceof Error ? err.message : "Failed to generate transcript");
            setTranscript("");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-4 max-w-3xl">
            <h1 className="text-2xl font-bold mb-4">Test Transcript Generation</h1>
            
            <div className="space-y-4">
                <div className="flex gap-2">
                    <Input
                        type="text"
                        value={chatId}
                        onChange={(e) => setChatId(e.target.value)}
                        placeholder="Enter Chat ID"
                        className="flex-1"
                    />
                    <Button 
                        onClick={handleGenerateTranscript}
                        disabled={loading}
                    >
                        {loading ? "Generating..." : "Generate Transcript"}
                    </Button>
                </div>

                {error && (
                    <div className="text-red-500 p-2 bg-red-50 rounded">
                        <p className="font-semibold">Error:</p>
                        <p>{error}</p>
                    </div>
                )}

                {debug && (
                    <Card className="p-4 bg-blue-50">
                        <h2 className="text-lg font-semibold mb-2">Debug Info:</h2>
                        <pre className="whitespace-pre-wrap text-sm">
                            {JSON.stringify(debug, null, 2)}
                        </pre>
                    </Card>
                )}

                {transcript && (
                    <Card className="p-4">
                        <h2 className="text-lg font-semibold mb-2">Generated Transcript:</h2>
                        <pre className="whitespace-pre-wrap bg-gray-50 p-4 rounded">
                            {transcript}
                        </pre>
                    </Card>
                )}
            </div>
        </div>
    );
} 