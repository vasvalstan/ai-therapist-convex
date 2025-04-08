"use client";

import { api } from "@/convex/_generated/api";
import { useQuery, useMutation } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { MessageCircle, Trash2, Pencil, Home, Loader2, Download } from "lucide-react";
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
import { generateAndDownloadTranscript } from "@/lib/transcript";

export function ChatHistory() {
    const sessions = useQuery(api.chat.getChatSessions);
    const params = useParams();
    const router = useRouter();
    const deleteChat = useMutation(api.chat.deleteChat);
    const renameChat = useMutation(api.chat.renameChat);
    const [chatToDelete, setChatToDelete] = useState<{ id: Id<"chatHistory">, title: string } | null>(null);
    const [chatToRename, setChatToRename] = useState<{ id: Id<"chatHistory">, title: string } | null>(null);
    const [newTitle, setNewTitle] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);
    const [isRenaming, setIsRenaming] = useState(false);
    const [isGeneratingTranscript, setIsGeneratingTranscript] = useState(false);

    const handleDelete = async (e: React.MouseEvent, id: Id<"chatHistory">, title: string) => {
        e.preventDefault(); // Prevent navigation
        setChatToDelete({ id, title });
    };

    const handleRename = async (e: React.MouseEvent, id: Id<"chatHistory">, currentTitle: string) => {
        e.preventDefault(); // Prevent navigation
        setChatToRename({ id, title: currentTitle });
        setNewTitle(currentTitle);
    };

    const handleGenerateTranscript = async (e: React.MouseEvent, session: any) => {
        e.preventDefault(); // Prevent navigation
        setIsGeneratingTranscript(true);
        try {
            await generateAndDownloadTranscript(session);
            // Optionally show a success message to the user
        } catch (error) {
            console.error("Failed to generate transcript:", error);
            // Optionally show an error message to the user
        } finally {
            setIsGeneratingTranscript(false);
        }
    };

    const confirmDelete = async () => {
        if (!chatToDelete) return;

        setIsDeleting(true);
        try {
            await deleteChat({ id: chatToDelete.id });
            if (params?.sessionId === chatToDelete.id) {
                router.push("/chat/history");
            }
            setChatToDelete(null);
        } catch (error) {
            console.error("Failed to delete chat:", error);
        } finally {
            setIsDeleting(false);
        }
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
            <div className="w-64 h-full border-r border-border flex flex-col">
                <div className="p-4 border-b border-border">
                    <h2 className="font-semibold">Chat History</h2>
                </div>
                <div className="flex-1 overflow-auto p-2 space-y-2">
                    {sessions === undefined && (
                        <>
                            <Skeleton className="h-16 w-full rounded-lg" />
                            <Skeleton className="h-16 w-full rounded-lg" />
                            <Skeleton className="h-16 w-full rounded-lg" />
                        </>
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
                            <Link
                                key={session._id}
                                href={`/chat/${session.sessionId}?tab=chat`}
                                className={`group flex items-center gap-2 p-2 rounded-lg hover:bg-muted transition-colors ${
                                    params?.sessionId === session.sessionId ? "bg-muted" : ""
                                }`}
                            >
                                <MessageCircle className="w-4 h-4 opacity-50" />
                                <div className="flex-1 overflow-hidden">
                                    <div className="truncate text-sm">{title}</div>
                                    <div className="text-xs text-muted-foreground">
                                        {formatDistanceToNow(session.updatedAt, { addSuffix: true })}
                                    </div>
                                    {session.messages && session.messages.length > 0 && (
                                        <div className="text-xs text-muted-foreground mt-1">
                                            {session.messages.length} messages
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={(e) => handleGenerateTranscript(e, session)}
                                        disabled={isGeneratingTranscript}
                                    >
                                        <Download className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={(e) => handleRename(e, session._id, title)}
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={(e) => handleDelete(e, session._id, title)}
                                    >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>

            <Dialog open={chatToDelete !== null} onOpenChange={(open) => !open && setChatToDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Conversation</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this conversation? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    {chatToDelete && (
                        <div className="py-3">
                            <p className="text-sm font-medium">Conversation:</p>
                            <p className="text-sm text-muted-foreground">{chatToDelete.title}</p>
                        </div>
                    )}
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setChatToDelete(null)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={confirmDelete}
                            disabled={isDeleting}
                        >
                            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={chatToRename !== null} onOpenChange={(open) => !open && setChatToRename(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rename Conversation</DialogTitle>
                        <DialogDescription>
                            Enter a new name for this conversation.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-3">
                        <Input
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            placeholder="Enter conversation name"
                            className="w-full"
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    confirmRename();
                                }
                            }}
                        />
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setChatToRename(null);
                                setNewTitle("");
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={confirmRename}
                            disabled={!newTitle.trim() || isRenaming}
                        >
                            {isRenaming && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Rename
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}