"use client";

import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { MessageCircle, Plus } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "../ui/button";

export function ChatHistory() {
    const sessions = useQuery(api.chat.getChatSessions);
    const params = useParams();

    return (
        <div className="w-64 h-full border-r border-border flex flex-col">
            <div className="p-4 border-b border-border flex items-center justify-between">
                <h2 className="font-semibold">Chat History</h2>
                <Link href="/chat">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Plus className="h-4 w-4" />
                    </Button>
                </Link>
            </div>
            <div className="flex-1 overflow-auto p-2 space-y-2">
                {sessions?.map((session) => {
                    // Find the first user or assistant message to use as title
                    const firstMessage = session.messages.find(
                        msg => msg.role === "user" || msg.role === "assistant"
                    );
                    const title = session.title || 
                        (firstMessage?.content.slice(0, 30) + "...") || 
                        "New conversation";

                    return (
                        <Link
                            key={session._id}
                            href={`/chat/${session.sessionId}`}
                            className={`flex items-center gap-2 p-2 rounded-lg hover:bg-muted transition-colors ${
                                params?.sessionId === session.sessionId ? "bg-muted" : ""
                            }`}
                        >
                            <MessageCircle className="w-4 h-4 opacity-50" />
                            <div className="flex-1 overflow-hidden">
                                <div className="truncate text-sm">{title}</div>
                                <div className="text-xs text-muted-foreground">
                                    {formatDistanceToNow(session.updatedAt, { addSuffix: true })}
                                </div>
                                {session.messages.length > 0 && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                        {session.messages.length} messages
                                    </div>
                                )}
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
} 