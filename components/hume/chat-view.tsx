"use client";

import { api } from "@/convex/_generated/api";
import { useQuery, useMutation } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { Bot, User, Loader2, ChevronLeft, ChevronRight, MessageSquare } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Controls } from "./controls";
import { toast } from "@/components/ui/use-toast";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import HumeChat from "./chat";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { StartConversationPanel } from "./start-conversation-panel";
import { TherapyProgress } from "./therapy-progress";
import { VoiceController } from "./voice-controller";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChatHistory } from "./chat-history";
import { Suspense } from "react";

// Define a consistent Message interface
interface Message {
    type: "USER_MESSAGE" | "AGENT_MESSAGE" | "SYSTEM_MESSAGE" | "CHAT_METADATA";
    role: "USER" | "ASSISTANT" | "SYSTEM" | "user" | "assistant";
    content?: string;
    messageText: string;
    timestamp: number;
    emotionFeatures?: string;
    chatId?: string;
    chatGroupId?: string;
    metadata?: {
        chat_id: string;
        chat_group_id: string;
        request_id: string;
        timestamp: string;
    };
}

// Parsed message with emotions properly extracted
interface ParsedMessage {
    role: string;
    content: string;
    timestamp: number;
    emotions?: Record<string, number>;
}

export interface ChatViewProps {
    sessionId: string;  // This is actually the chatId from the URL
    accessToken?: string;
}

export function ChatView({ sessionId, accessToken }: ChatViewProps) {
    const conversation = useQuery(api.chat.getActiveConversation, { chatId: sessionId });
    const containerRef = useRef<HTMLDivElement>(null);
    
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const currentTab = searchParams?.get("tab") || "chat";
    
    const [routerError, setRouterError] = useState(false);
    const [isCallEnding, setIsCallEnding] = useState(false);
    const [showSidebar, setShowSidebar] = useState(false);
    
    const endConversationAndSummarize = useMutation(api.summary.endConversationAndSummarize);
    const addMessage = useMutation(api.chat.addMessageToSession);

    // Parse messages with proper emotion handling
    const parsedMessages: ParsedMessage[] = conversation?.messages?.map((msg: any) => {
        let emotions: Record<string, number> | undefined;
        if (msg.emotionFeatures) {
            try {
                emotions = typeof msg.emotionFeatures === 'string' 
                    ? JSON.parse(msg.emotionFeatures) 
                    : msg.emotionFeatures;
            } catch (e) {
                console.error("Failed to parse emotions:", e);
            }
        }
        
        return {
            role: msg.role,
            content: msg.content || msg.messageText,
            timestamp: msg.timestamp,
            emotions
        };
    }) || [];

    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
    }, [parsedMessages.length]);
    
    useEffect(() => {
        if (!searchParams?.get("tab")) {
            const redirectUrl = `${pathname}?tab=chat`;
            try {
                router.push(redirectUrl);
            } catch (error) {
                setRouterError(true);
            }
        }
    }, []);

    const safeNavigate = (path: string) => {
        try {
            router.push(path);
        } catch (error) {
            setRouterError(true);
        }
    };

    // Render loading state if call is ending
    if (isCallEnding) {
        return (
            <div className="flex h-screen">
                <Suspense fallback={<div className="w-64 h-full border-r border-border" />}>
                    <ChatHistory />
                </Suspense>
                <div className="flex-1 flex flex-col items-center justify-center p-4 relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 to-indigo-50/30 dark:from-blue-950/10 dark:to-indigo-950/10" />
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px]" />
                    
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
            </div>
        );
    }

    if (conversation === undefined) {
        return (
            <div className="flex h-screen">
                <Suspense fallback={<div className="w-64 h-full border-r border-border" />}>
                    <ChatHistory />
                </Suspense>
                <div className="flex-1 flex flex-col p-4 space-y-4">
                    <Skeleton className="h-16 w-4/5 rounded-lg self-start" />
                    <Skeleton className="h-20 w-4/5 rounded-lg self-end" />
                    <Skeleton className="h-16 w-3/5 rounded-lg self-start" />
                    <Skeleton className="h-24 w-4/5 rounded-lg self-end" />
                    <Skeleton className="h-16 w-1/2 rounded-lg self-start" />
                </div>
            </div>
        );
    }

    if (conversation === null) {
        return (
            <div className="flex h-screen">
                <Suspense fallback={<div className="w-64 h-full border-r border-border" />}>
                    <ChatHistory />
                </Suspense>
                <div className="flex-1 flex items-center justify-center p-8">
                    <div className="text-center space-y-4">
                        <h2 className="text-xl font-medium">Conversation Not Found</h2>
                        <p className="text-muted-foreground">The chat you're looking for doesn't exist or has been deleted.</p>
                        <Button onClick={() => router.push('/chat/history')}>
                            Go to Chat History
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen relative">
            {/* Mobile Chat history sidebar toggle button */}
            <button 
                onClick={() => setShowSidebar(!showSidebar)}
                className="lg:hidden absolute top-20 left-2 z-20 rounded-full bg-primary text-primary-foreground w-10 h-10 flex items-center justify-center shadow-md"
                aria-label={showSidebar ? "Hide recent chats" : "Show recent chats"}
            >
                {showSidebar ? <ChevronLeft size={20} /> : <MessageSquare size={18} />}
            </button>
            
            {/* Chat history sidebar - hidden by default on mobile, toggleable with button */}
            <div className={`${showSidebar ? 'absolute inset-y-0 left-0 z-10 w-full md:w-64 transition-transform duration-300 transform translate-x-0' : 'absolute inset-y-0 left-0 z-10 w-full md:w-64 transition-transform duration-300 transform -translate-x-full md:relative md:translate-x-0'}`}>
                <Suspense fallback={<div className="w-full md:w-64 h-full border-r border-border bg-background" />}>
                    <ChatHistory />
                </Suspense>
            </div>
            
            {/* Main chat content */}
            <div className={`flex-1 flex flex-col relative h-full ${showSidebar ? 'hidden md:flex' : 'flex'}`}>
                {/* Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 to-indigo-50/30 dark:from-blue-950/10 dark:to-indigo-950/10" />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px]" />
                
                {/* Content */}
                <div className="relative z-10 flex-1 flex flex-col">
                    <Tabs defaultValue={currentTab} className="flex-1">
                        <TabsContent value="start" className="mt-0 h-[calc(100%-48px)]">
                            <StartConversationPanel />
                        </TabsContent>
                        
                        <TabsContent value="progress" className="mt-0 h-[calc(100%-48px)] overflow-auto">
                            <TherapyProgress />
                        </TabsContent>
                        
                        <TabsContent value="chat" className="mt-0 h-[calc(100%-48px)] flex flex-col">
                            {!accessToken && <VoiceController sessionId={sessionId} />}
                            
                            <div className="p-4 bg-gradient-to-r from-blue-50/30 to-indigo-50/30 dark:from-blue-950/10 dark:to-indigo-950/10 border-b flex justify-between items-center">
                                <h1 className="text-lg font-medium">Chat with Sereni</h1>
                            </div>
                            
                            {!parsedMessages || parsedMessages.length === 0 ? (
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
                                                {parsedMessages.map((msg, index) => {
                                                    return (
                                                        <div
                                                            key={index}
                                                            className={`mb-4 max-w-[80%] rounded-lg p-4 ${
                                                                msg.role.toLowerCase() === "assistant" ? "ml-auto bg-blue-50 dark:bg-blue-950/50" : 
                                                                "mr-auto bg-white dark:bg-gray-900/50"
                                                            }`}
                                                        >
                                                            <div className="flex items-start gap-2">
                                                                {msg.role.toLowerCase() === "assistant" ? (
                                                                    <Bot className="mt-1 size-4 text-blue-500" />
                                                                ) : (
                                                                    <User className="mt-1 size-4 text-gray-500" />
                                                                )}
                                                                <div>
                                                                    <p>{msg.content}</p>
                                                                    {msg.emotions && (
                                                                        <div className="mt-2 flex flex-wrap gap-1">
                                                                            {Object.entries(msg.emotions)
                                                                                .sort(([, a], [, b]) => b - a)
                                                                                .slice(0, 3)
                                                                                .map(([emotion, score]) => (
                                                                                    <span
                                                                                        key={emotion}
                                                                                        className="inline-flex items-center rounded-full bg-blue-50/50 dark:bg-blue-950/50 px-2 py-0.5 text-xs text-blue-600 dark:text-blue-400"
                                                                                    >
                                                                                        {emotion} ({Math.round(score * 100)}%)
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
        </div>
    );
}