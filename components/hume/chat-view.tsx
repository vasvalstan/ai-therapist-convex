"use client";

import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { Bot, User } from "lucide-react";
import { useEffect, useRef } from "react";

interface ChatViewProps {
    sessionId: string;
}

export function ChatView({ sessionId }: ChatViewProps) {
    const session = useQuery(api.chat.getChatSession, { sessionId });
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
    }, [session?.messages]);

    if (!session) {
        return (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
                Loading conversation...
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col">
            <div className="border-b border-border p-4">
                <h2 className="font-semibold">
                    {session.title || "Chat Session"}
                </h2>
                <div className="text-sm text-muted-foreground">
                    Started {formatDistanceToNow(session.createdAt, { addSuffix: true })}
                </div>
            </div>
            
            <div ref={containerRef} className="flex-1 overflow-auto p-4 space-y-4">
                {session.messages.map((message, index) => (
                    <div
                        key={index}
                        className={`flex gap-3 ${
                            message.role === "assistant" ? "flex-row" : "flex-row-reverse"
                        }`}
                    >
                        <div className={`flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md border ${
                            message.role === "assistant" ? "bg-primary/10" : "bg-muted"
                        }`}>
                            {message.role === "assistant" ? (
                                <Bot className="h-4 w-4" />
                            ) : (
                                <User className="h-4 w-4" />
                            )}
                        </div>
                        <div className={`flex flex-col gap-1 ${
                            message.role === "assistant" ? "" : "items-end"
                        }`}>
                            <div className="rounded-lg bg-muted p-3 text-sm">
                                {message.content}
                            </div>
                            {message.emotions && (
                                <div className="text-xs text-muted-foreground px-1">
                                    {Object.entries(message.emotions as Record<string, number>)
                                        .sort(([, a], [, b]) => (b as number) - (a as number))
                                        .slice(0, 3)
                                        .map(([emotion, score]) => (
                                            <span key={emotion} className="mr-2">
                                                {emotion}: {((score as number) * 100).toFixed(0)}%
                                            </span>
                                        ))}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
} 