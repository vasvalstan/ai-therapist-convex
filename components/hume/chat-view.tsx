"use client";

import { api } from "@/convex/_generated/api";
import { useQuery, useMutation } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { Bot, User, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Controls } from "./controls";
import { toast } from "@/components/ui/use-toast";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import HumeChat from "./chat";
import { ChatNav } from "./chat-nav";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { StartConversationPanel } from "./start-conversation-panel";
import { TherapyProgress } from "./therapy-progress";
import { VoiceController } from "./voice-controller";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export interface ChatViewProps {
    sessionId: string;  // This is actually the chatId from the URL
    accessToken?: string;
}

export function ChatView({ sessionId, accessToken }: ChatViewProps) {
    // Don't fetch from Convex here, we rely on the parent component passing it
    // This avoids double fetching and allows the parent component to handle errors
    const conversation = useQuery(api.chat.getActiveConversation, { chatId: sessionId });
    const containerRef = useRef<HTMLDivElement>(null);
    
    // Always initialize hooks at the top level
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const currentTab = searchParams?.get("tab") || "chat";
    
    // Log important debugging information
    console.log("ChatView received:", { 
        sessionId, 
        hasConversation: !!conversation,
        messageCount: conversation?.messages?.length || 0,
        currentTab,
        hasAccessToken: !!accessToken
    });
    
    const [isSendingTestMessages, setIsSendingTestMessages] = useState(false);
    const [routerError, setRouterError] = useState(false);
    // Add state to track call ending process
    const [isCallEnding, setIsCallEnding] = useState(false);
    
    // Add the mutation for ending conversation and generating summary
    const endConversationAndSummarize = useMutation(api.summary.endConversationAndSummarize);
    const addMessage = useMutation(api.chat.addMessageToSession);

    // Convert messages for display
    const messages = conversation?.messages?.map(msg => ({
        role: msg.role,
        content: msg.content,
        emotions: msg.emotions,
        timestamp: msg.timestamp,
    })) || [];

    // Handle scrolling when messages change
    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
    }, [messages.length]);
    
    // Handle tab redirect only once on mount with stable dependencies
    useEffect(() => {
        if (!searchParams.get("tab")) {
            const redirectUrl = `${pathname}?tab=chat`;
            console.log(`Redirecting to chat tab: ${redirectUrl}`);
            
            try {
                router.push(redirectUrl);
            } catch (error) {
                console.error("Navigation error:", error);
                setRouterError(true);
            }
        }
    }, []);  // Empty dependency array to run only once on mount

    // Safe navigation function that handles potential router errors
    const safeNavigate = (path: string) => {
        try {
            router.push(path);
        } catch (error) {
            console.error("Navigation error:", error);
            setRouterError(true);
        }
    };

    // Add a function to handle sending test messages
    const handleSendTestMessages = async () => {
        if (!sessionId) return;
        
        try {
            setIsSendingTestMessages(true);
            console.log("Sending test messages to chat:", sessionId);
            
            // Test user message
            const userMessage = {
                role: "user" as "user" | "assistant",
                content: "This is a test user message",
                emotions: { happiness: 0.8, neutral: 0.2 }
            };
            
            console.log("Sending test user message:", JSON.stringify(userMessage, null, 2));
            await addMessage({
                sessionId,
                message: userMessage
            });
            
            // Test assistant message
            const assistantMessage = {
                role: "assistant" as "user" | "assistant",
                content: "This is a test assistant response",
                emotions: undefined
            };
            
            console.log("Sending test assistant message:", JSON.stringify(assistantMessage, null, 2));
            await addMessage({
                sessionId,
                message: assistantMessage
            });
            
            toast({
                title: "Success",
                description: "Test messages sent. Refresh the page to see them.",
            });
            
            // Refresh the page to show the new messages
            router.refresh();
        } catch (error) {
            console.error("Error sending test messages:", error);
            toast({
                title: "Error",
                description: "Failed to send test messages",
                variant: "destructive"
            });
        } finally {
            setIsSendingTestMessages(false);
        }
    };

    // Render loading state if call is ending
    if (isCallEnding) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-4 relative">
                {/* Background matching the main view */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 to-indigo-50/30 dark:from-blue-950/10 dark:to-indigo-950/10" />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px]" />
                
                {/* Content Card */}
                <Card className="w-full max-w-md z-10">
                    <CardHeader>
                        <CardTitle className="text-center">Ending Session</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center space-y-4">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-muted-foreground">Saving your conversation...</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (conversation === undefined) {
        return (
            <div className="flex-1 flex flex-col p-4 space-y-4">
                <Skeleton className="h-16 w-4/5 rounded-lg self-start" />
                <Skeleton className="h-20 w-4/5 rounded-lg self-end" />
                <Skeleton className="h-16 w-3/5 rounded-lg self-start" />
                <Skeleton className="h-24 w-4/5 rounded-lg self-end" />
                <Skeleton className="h-16 w-1/2 rounded-lg self-start" />
            </div>
        );
    }

    if (conversation === null) {
        return (
            <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center space-y-4">
                    <h2 className="text-xl font-medium">Conversation Not Found</h2>
                    <p className="text-muted-foreground">The chat you're looking for doesn't exist or has been deleted.</p>
                    <Button onClick={() => router.push('/chat/history')}>
                        Go to Chat History
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col relative h-full">
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 to-indigo-50/30 dark:from-blue-950/10 dark:to-indigo-950/10" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px]" />
            
            {/* Content */}
            <div className="relative z-10 flex-1 flex flex-col">
                <Tabs defaultValue={currentTab} className="flex-1">
                    <ChatNav />
                    
                    <TabsContent value="start" className="mt-0 h-[calc(100%-48px)]">
                        <VoiceController />
                        <StartConversationPanel />
                    </TabsContent>
                    
                    <TabsContent value="progress" className="mt-0 h-[calc(100%-48px)] overflow-auto">
                        <TherapyProgress />
                    </TabsContent>
                    
                    <TabsContent value="chat" className="mt-0 h-[calc(100%-48px)] flex flex-col">
                        {/* Header */}
                        <div className="p-4 bg-gradient-to-r from-blue-50/30 to-indigo-50/30 dark:from-blue-950/10 dark:to-indigo-950/10 border-b flex justify-between items-center">
                            <h1 className="text-lg font-medium">Chat with Sereni</h1>
                            
                            {/* Test Messages Button - only in development */}
                            {process.env.NODE_ENV === "development" && (
                                <button
                                    onClick={handleSendTestMessages}
                                    disabled={isSendingTestMessages}
                                    className="py-1 px-3 bg-red-500 hover:bg-red-600 text-white text-sm rounded-md disabled:opacity-50 transition-colors"
                                >
                                    {isSendingTestMessages ? "Sending..." : "Test Messages"}
                                </button>
                            )}
                        </div>
                        
                        {!conversation.messages || conversation.messages.length === 0 ? (
                            <div className="flex-1 flex flex-col">
                                {accessToken ? (
                                    <HumeChat 
                                        accessToken={accessToken} 
                                        sessionId={sessionId} 
                                        onEndCallStart={() => setIsCallEnding(true)}
                                    />
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center gap-4">
                                        <p className="text-muted-foreground text-center">No messages in this conversation yet.</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col">
                                {accessToken ? (
                                    <HumeChat 
                                        accessToken={accessToken} 
                                        sessionId={sessionId} 
                                        onEndCallStart={() => setIsCallEnding(true)}
                                    />
                                ) : (
                                    <>
                                        {/* Messages */}
                                        <div ref={containerRef} className="flex-1 overflow-y-auto p-4">
                                            {conversation?.messages?.map((msg, index) => {
                                                return (
                                                    <div
                                                        key={index}
                                                        className={`mb-4 max-w-[80%] rounded-lg p-4 ${
                                                            msg.role === "assistant" ? "ml-auto bg-blue-50 dark:bg-blue-950/50" : 
                                                            "mr-auto bg-white dark:bg-gray-900/50"
                                                        }`}
                                                    >
                                                        <div className="flex items-start gap-2">
                                                            {msg.role === "assistant" ? (
                                                                <Bot className="mt-1 size-4 text-blue-500" />
                                                            ) : (
                                                                <User className="mt-1 size-4 text-gray-500" />
                                                            )}
                                                            <div>
                                                                <p>{msg.content}</p>
                                                                {msg.emotions && (
                                                                    <div className="mt-2 flex flex-wrap gap-1">
                                                                        {Object.entries(msg.emotions)
                                                                            .sort(([, a], [, b]) => (b as number) - (a as number))
                                                                            .slice(0, 3)
                                                                            .map(([emotion, score]) => (
                                                                                <span
                                                                                    key={emotion}
                                                                                    className="inline-flex items-center rounded-full bg-blue-50/50 dark:bg-blue-950/50 px-2 py-0.5 text-xs text-blue-600 dark:text-blue-400"
                                                                                >
                                                                                    {emotion} ({Math.round((score as number) * 100)}%)
                                                                                </span>
                                                                            ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <Controls />
                                    </>
                                )}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}