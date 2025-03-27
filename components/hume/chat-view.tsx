"use client";

import { api } from "@/convex/_generated/api";
import { useQuery, useMutation } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { Bot, User } from "lucide-react";
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

export interface ChatViewProps {
    sessionId: string;  // This is actually the chatId from the URL
    accessToken?: string;
}

export function ChatView({ sessionId, accessToken }: ChatViewProps) {
    // Use getActiveConversation with the sessionId as chatId
    const conversation = useQuery(api.chat.getActiveConversation, { chatId: sessionId });
    const containerRef = useRef<HTMLDivElement>(null);
    
    // Always initialize hooks at the top level
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();
    
    const [isEndingConversation, setIsEndingConversation] = useState(false);
    const [isSendingTestMessages, setIsSendingTestMessages] = useState(false);
    const [routerError, setRouterError] = useState(false);
    
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

    // Safe navigation function that handles potential router errors
    const safeNavigate = (path: string) => {
        try {
            router.push(path);
        } catch (error) {
            console.error("Navigation error:", error);
            setRouterError(true);
        }
    };

    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
        
        // Only redirect if no tab is specified - don't override an explicit tab=chat
        try {
            if (!searchParams.get("tab")) {
                router.push(`${pathname}?tab=chat`);
            }
        } catch (error) {
            console.error("Error during navigation:", error);
            setRouterError(true);
        }
    }, [pathname, router, searchParams]);

    // Handle ending the conversation
    const handleEndConversation = async () => {
        if (!sessionId) return;
        
        setIsEndingConversation(true);
        try {
            const result = await endConversationAndSummarize({ sessionId });
            if (result?.success) {
                try {
                    router.push('/chat/history');
                } catch (error) {
                    console.error("Navigation error:", error);
                    setRouterError(true);
                }
            }
        } catch (error) {
            console.error("Error ending conversation:", error);
        } finally {
            setIsEndingConversation(false);
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

    if (!conversation) {
        return (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
                Loading conversation...
            </div>
        );
    }

    // Always default to chat tab instead of start
    const currentTab = searchParams?.get("tab") || "chat";

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
                            
                            {/* Test Messages Button */}
                            <button
                                onClick={handleSendTestMessages}
                                disabled={isSendingTestMessages}
                                className="py-1 px-3 bg-red-500 hover:bg-red-600 text-white text-sm rounded-md disabled:opacity-50 transition-colors"
                            >
                                {isSendingTestMessages ? "Sending..." : "Test Messages"}
                            </button>
                        </div>
                        
                        {accessToken ? (
                            <div className="flex-1 flex flex-col">
                                <HumeChat accessToken={accessToken} sessionId={sessionId} />
                            </div>
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
                                
                                {/* Controls */}
                                <div className="p-4 bg-gradient-to-t from-card via-card/90 to-card/0">
                                    <button
                                        onClick={handleEndConversation}
                                        disabled={isEndingConversation}
                                        className="w-full py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-md disabled:opacity-50 transition-colors"
                                    >
                                        {isEndingConversation ? "Ending conversation..." : "End Conversation"}
                                    </button>
                                </div>
                            </>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
} 