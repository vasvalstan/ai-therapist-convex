"use client";

import { api } from "@/convex/_generated/api";
import { useQuery, useMutation } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { MessageCircle, Trash2, Pencil } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button } from "../ui/button";
import { Id } from "@/convex/_generated/dataModel";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { useState } from "react";
import { Skeleton } from "../ui/skeleton";

export function ChatHistory() {
    const sessions = useQuery(api.chat.getChatSessions);
    const params = useParams();
    const router = useRouter();
    const renameChat = useMutation(api.chat.renameChat);
    const [chatToRename, setChatToRename] = useState<{ id: Id<"chatHistory">, title: string } | null>(null);
    const [newTitle, setNewTitle] = useState("");
    const [isRenaming, setIsRenaming] = useState(false);

    const handleRename = async (e: React.MouseEvent, id: Id<"chatHistory">, currentTitle: string) => {
        e.preventDefault(); // Prevent navigation
        e.stopPropagation(); // Prevent clicking the parent link
        setChatToRename({ id, title: currentTitle });
        setNewTitle(currentTitle);
    };

    const confirmRename = async () => {
        if (!chatToRename || !newTitle.trim()) return;

        setIsRenaming(true);
        try {
            await renameChat({
                id: chatToRename.id,
                title: newTitle.trim()
            });
            setChatToRename(null);
            setNewTitle("");
        } catch (error) {
            console.error("Failed to rename chat:", error);
        } finally {
            setIsRenaming(false);
        }
    };

    return (
        <>
            <div className="w-full md:w-64 h-full border-r border-border flex flex-col bg-background">
                <div className="p-4 border-b border-border flex justify-between items-center">
                    <h2 className="font-semibold">Recent Chats</h2>
                    <Button
                        variant="outline"
                        size="sm"
                        className="md:hidden"
                        onClick={() => router.push("/chat/history?tab=start")}
                    >
                        <MessageCircle className="h-4 w-4 mr-1" />
                        New Chat
                    </Button>
                </div>
                <div className="flex-1 overflow-auto p-2 space-y-2">
                    {sessions === undefined && (
                        <>
                            <Skeleton className="h-16 w-full rounded-lg" />
                            <Skeleton className="h-16 w-full rounded-lg" />
                            <Skeleton className="h-16 w-full rounded-lg" />
                        </>
                    )}
                    {sessions?.length === 0 && (
                        <div className="text-center p-4 text-muted-foreground">
                            <p>No conversations yet</p>
                            <Button 
                                variant="default" 
                                className="mt-4"
                                onClick={() => router.push("/chat/history?tab=start")}
                            >
                                <MessageCircle className="h-4 w-4 mr-2" />
                                Start a new chat
                            </Button>
                        </div>
                    )}
                    {sessions?.map((session) => {
                        // Find the first user or assistant message to use as title
                        const firstMessage = session.messages && session.messages.find(
                            msg => msg.role === "USER" || msg.role === "ASSISTANT"
                        );
                        const title = session.title || 
                            (firstMessage?.content?.slice(0, 30) + "...") || 
                            "New conversation";

                        return (
                            <div
                                key={session._id}
                                className={`group rounded-lg hover:bg-muted transition-colors overflow-hidden ${
                                    params?.sessionId === session.sessionId ? "bg-muted" : ""
                                }`}
                            >
                                <Link
                                    href={`/chat/${session.sessionId}?tab=chat`}
                                    className="block p-3"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="bg-primary/10 rounded-full p-2">
                                            <MessageCircle className="w-4 h-4 text-primary" />
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            <div className="truncate font-medium">{title}</div>
                                            <div className="text-xs text-muted-foreground flex items-center gap-2">
                                                <span>{formatDistanceToNow(session.updatedAt || session._creationTime, { addSuffix: true })}</span>
                                                {session.messages && session.messages.length > 0 && (
                                                    <>
                                                        <span>•</span>
                                                        <span>{session.messages.length} messages</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                                <div className="flex border-t border-border/50 bg-muted/50">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-10 w-full rounded-none text-xs"
                                        onClick={(e) => handleRename(e, session._id, title)}
                                    >
                                        <Pencil className="h-3.5 w-3.5 mr-1" />
                                        Edit
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Rename dialog */}
            <Dialog open={chatToRename !== null} onOpenChange={() => setChatToRename(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rename Chat</DialogTitle>
                        <DialogDescription>
                            Enter a new name for the chat.
                        </DialogDescription>
                    </DialogHeader>
                    <Input
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="Enter chat name"
                    />
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setChatToRename(null);
                                setNewTitle("");
                            }}
                            disabled={isRenaming}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="default"
                            onClick={confirmRename}
                            disabled={isRenaming || !newTitle.trim()}
                        >
                            {isRenaming ? "Saving..." : "Save"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}