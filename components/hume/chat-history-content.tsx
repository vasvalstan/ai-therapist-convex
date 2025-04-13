"use client";

import { ChatHistory } from "@/components/hume/chat-history";
import { Suspense, useEffect, useState, useRef, useCallback } from "react";
import { useAuth as useClerkAuth } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { useQuery, Authenticated, useConvexAuth, useMutation } from "convex/react";
import { UpgradePrompt } from "@/components/hume/upgrade-prompt";
import { StartConversationPanel } from "@/components/hume/start-conversation-panel";
import { VoiceController } from "@/components/hume/voice-controller";
import { TherapyProgress } from "@/components/hume/therapy-progress";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { toast } from "@/components/ui/use-toast";
import { ChatNav } from "@/components/hume/chat-nav";
import { Message, ChatSession } from "@/lib/types";
import { FileText, BarChart2, MessageCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ReactNode } from "react";
import { formatDistanceToNow } from "date-fns";

export function ChatHistoryContentWrapper() {
  const { isLoading, isAuthenticated } = useConvexAuth();

  // Show initial loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <div>Loading...</div>
        </div>
      </div>
    );
  }

  // Show authenticated content
  return (
    <Authenticated>
      <ChatHistoryContent />
    </Authenticated>
  );
}

export function ChatHistoryContent() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accessStatus, setAccessStatus] = useState<{
    hasAccess: boolean;
    reason?: string;
    limitType?: string;
  }>({ hasAccess: true });

  const { isAuthenticated } = useConvexAuth();
  const { userId } = useClerkAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  
  // Extract chat ID from the path - handle potential invalid formats
  const activeChatId = pathname?.split('/chat/')[1]?.split('?')[0];

  // Get the current user's plan status
  const user = useQuery(api.users.getUserByToken, 
    userId ? { tokenIdentifier: userId } : "skip"
  );

  // Get active conversation if we have a valid chat ID
  const activeConversation = useQuery(
    api.chat.getActiveConversation,
    activeChatId ? { chatId: activeChatId } : "skip"
  );

  // Get user's chat sessions
  const chatSessions = useQuery(
    api.chat.getChatSessions,
    userId ? {} : "skip"
  );
  
  // Get plan details
  const plans = useQuery(api.plans.getAllPlans);

  // Store user if not found
  const [isStoringUser, setIsStoringUser] = useState(false);
  const storeUser = useMutation(api.users.store);

  // State hooks
  const [isTokenLoading, setIsTokenLoading] = useState(false);

  // Effects
  useEffect(() => {
    if (!userId || isStoringUser || user !== null || !isAuthenticated) {
      return;
    }

    let isMounted = true;
    setIsStoringUser(true);

    const createUser = async () => {
      try {
        await storeUser();
        if (isMounted) {
          router.refresh();
        }
      } catch (err) {
        console.error('Error storing user:', err);
        if (isMounted) {
          setError('Failed to initialize user data. Please try refreshing the page.');
        }
      } finally {
        if (isMounted) {
          setIsStoringUser(false);
        }
      }
    };

    createUser();

    return () => {
      isMounted = false;
    };
  }, [userId, user, isStoringUser, isAuthenticated, storeUser, router]);

  useEffect(() => {
    if (!user || !plans || !chatSessions) {
      return;
    }

    const userPlan = plans.find(plan => plan.key === (user.currentPlanKey || "free"));
    
    if (!userPlan) {
      setAccessStatus({
        hasAccess: false,
        reason: "Unable to determine your plan. Please contact support.",
      });
      return;
    }
    
    if (userPlan.key !== "free" && 
        user.minutesRemaining !== undefined && 
        user.minutesRemaining <= 0) {
      setAccessStatus({
        hasAccess: false,
        reason: "You have used all your available minutes. Please upgrade your plan to continue.",
        limitType: "minutes"
      });
      return;
    }
    
    setAccessStatus(current => {
      if (!current.hasAccess || current.reason) {
        return { hasAccess: true };
      }
      return current;
    });
  }, [user, plans, chatSessions]);

  useEffect(() => {
    if (!accessStatus.hasAccess || !user || isTokenLoading) {
      return;
    }
    
    let isMounted = true;
    
    const fetchToken = async () => {
      try {
        setIsTokenLoading(true);
        const response = await fetch("/api/hume/token");
        const data = await response.json();

        if (!isMounted) return;

        if (data.error) {
          setError(data.error);
          return;
        }

        setAccessToken(data.accessToken);
      } catch (err) {
        if (!isMounted) return;
        setError("Failed to get Hume access token");
        console.error("Error fetching Hume token:", err);
      } finally {
        if (isMounted) {
          setIsTokenLoading(false);
        }
      }
    };

    fetchToken();
    
    return () => {
      isMounted = false;
    };
  }, [user, accessStatus.hasAccess]);

  // If user is not authenticated, show loading state
  if (!userId) {
    return (
      <div className="flex h-screen flex-col">
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <div>Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  // If storing user, show loading state
  if (isStoringUser) {
    return (
      <div className="flex h-screen flex-col">
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <div>Initializing your account...</div>
          </div>
        </div>
      </div>
    );
  }

  // If initial data is loading, show loading state
  if (!user || !plans || !chatSessions) {
    return (
      <div className="flex h-screen flex-col">
        <div className="flex flex-1 overflow-hidden">
          <div className="hidden md:block w-64 h-full border-r border-border">
            <div className="p-4 border-b border-border">
              <h2 className="font-semibold">Recent Chats</h2>
            </div>
            <div className="p-4 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <div>Loading your chat history...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If user doesn't have access, show upgrade prompt
  if (!accessStatus.hasAccess && accessStatus.reason) {
    return (
      <div className="flex h-screen flex-col">
        <div className="flex flex-1 overflow-hidden">
          <div className="hidden md:block">
            <ChatHistory />
          </div>
          <div className="flex-1 flex items-center justify-center p-4">
            <UpgradePrompt 
              reason={accessStatus.reason} 
              chatId={chatSessions && chatSessions.length > 0 ? chatSessions[0].chatId : undefined} 
            />
          </div>
        </div>
      </div>
    );
  }

  // Main content for chat history page
  const activeTab = searchParams?.get("tab") || "start";
  
  return (
    <div className="flex h-screen flex-col">
      <div className="flex flex-1 overflow-hidden">
        {/* Chat history sidebar - hidden on mobile */}
        <div className="hidden md:block">
          <ChatHistory />
        </div>
        
        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Show mobile chat history when activeTab is "history" */}
          {activeTab === "history" ? (
            <div className="md:hidden flex-1 flex flex-col">
              <div className="p-4 border-b border-border">
                <h2 className="font-semibold">Recent Chats</h2>
              </div>
              <div className="flex-1 overflow-auto">
                <MobileChatHistory />
              </div>
            </div>
          ) : (
            <Tabs defaultValue={activeTab} value={activeTab} className="flex-1">
              <TabsContent value="start" className="mt-0 h-full overflow-auto">
                <StartConversationPanel />
              </TabsContent>
              <TabsContent value="progress" className="mt-0 h-full overflow-auto">
                <TherapyProgress />
              </TabsContent>
              <TabsContent value="history" className="mt-0 h-full overflow-auto md:hidden">
                <MobileChatHistory />
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
}

// Mobile-optimized chat history component
function MobileChatHistory() {
  const sessions = useQuery(api.chat.getChatSessions);
  const router = useRouter();
  
  if (sessions === undefined) {
    return (
      <div className="p-4 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  if (!sessions || sessions.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <p>No conversations yet</p>
        <p className="text-sm mt-2">Start a new chat to begin</p>
      </div>
    );
  }
  
  return (
    <div className="divide-y">
      {sessions.map((session) => {
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
            className="p-4 flex flex-col gap-2 active:bg-muted"
            onClick={() => router.push(`/chat/${session.sessionId}?tab=chat`)}
          >
            <div className="flex items-start gap-2">
              <MessageCircle className="w-5 h-5 mt-0.5 text-muted-foreground" />
              <div className="flex-1">
                <div className="font-medium">{title}</div>
                <div className="text-sm text-muted-foreground">
                  {formatDistanceToNow(session.updatedAt || session._creationTime, { addSuffix: true })}
                </div>
              </div>
            </div>
            {session.messages && session.messages.length > 0 && (
              <div className="text-sm text-muted-foreground ml-7">
                {session.messages.length} messages
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Export the wrapper as default
export default ChatHistoryContentWrapper;

// Component to display message history
function MessageHistory({ conversation }: { conversation: ChatSession }): ReactNode {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [conversation.messages?.length, scrollToBottom]);

  const renderMessage = (item: Message, index: number) => {
    const isUser = item.role === 'USER';
    const content = item.content;
    const timestamp = new Date(item.timestamp);
    
    return (
      <div key={index} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
        <div className={`max-w-[80%] rounded-lg p-4 ${isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
          <div className="text-sm">{content}</div>
          <div className="text-xs mt-2 opacity-70">{timestamp.toLocaleString()}</div>
        </div>
      </div>
    );
  };

  if (!conversation.messages?.length) {
    return (
      <div className="text-center">
        <div className="text-muted-foreground mb-4">No messages in this conversation.</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-4 overflow-auto scroll-smooth">
      {conversation.messages.map((item, index) => renderMessage(item, index))}
      <div ref={messagesEndRef} />
    </div>
  );
}

// Component to display transcript
function TranscriptView({ conversation }: { conversation: ChatSession }): ReactNode {
  if (!conversation.messages?.length) {
    return (
      <div className="text-center">
        <div className="text-muted-foreground mb-4">No transcript available for this conversation.</div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Conversation Transcript
        </CardTitle>
      </CardHeader>
      <CardContent>
        <pre className="text-sm whitespace-pre-wrap bg-muted p-4 rounded-md">
          {conversation.messages.map((item, index) => {
            let prefix;
            switch(item.type) {
              case 'USER_MESSAGE':
                prefix = 'User:';
                break;
              case 'AGENT_MESSAGE':
                prefix = 'Therapist:';
                break;
              case 'TOOL_CALL_MESSAGE':
                prefix = 'System (Tool Call):';
                break;
              case 'TOOL_RESPONSE_MESSAGE':
                prefix = 'System (Tool Response):';
                break;
              default:
                prefix = `System (${item.type}):`;
            }
            return `${prefix} ${item.content}\n`;
          }).join('\n')}
        </pre>
      </CardContent>
    </Card>
  );
}

// Component to display emotion analysis
function EmotionAnalysis({ conversation }: { conversation: ChatSession }): ReactNode {
  const emotionMessages = conversation.messages?.filter(
    message => message.type === "USER_MESSAGE" && message.emotionFeatures
  );

  if (!emotionMessages?.length) {
    return (
      <div className="text-center">
        <div className="text-muted-foreground mb-4">
          No emotion data available for this conversation.
        </div>
      </div>
    );
  }

  // Aggregate emotion data
  const emotionData: Record<string, { total: number, count: number, values: number[] }> = {};
  
  emotionMessages.forEach(message => {
    if (!message.emotionFeatures) return;
    
    try {
      const emotions = JSON.parse(message.emotionFeatures as string);
      
      Object.entries(emotions).forEach(([emotion, score]) => {
        if (!emotionData[emotion]) {
          emotionData[emotion] = { total: 0, count: 0, values: [] };
        }
        
        emotionData[emotion].total += score as number;
        emotionData[emotion].count += 1;
        emotionData[emotion].values.push(score as number);
      });
    } catch (e) {
      console.error("Error parsing emotion features:", e);
    }
  });

  // Calculate averages and sort by highest average
  const emotionAverages = Object.entries(emotionData)
    .map(([emotion, data]) => ({
      emotion,
      average: data.total / data.count,
      count: data.count,
      values: data.values
    }))
    .sort((a, b) => b.average - a.average);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart2 className="h-5 w-5" />
            Voice Emotion Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground mb-4">
              Analysis of emotions detected in the user's voice throughout this conversation.
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {emotionAverages.slice(0, 6).map(({ emotion, average }) => (
                <div key={emotion} className="flex flex-col">
                  <div className="flex justify-between items-center mb-2">
                    <span className="capitalize">{emotion}</span>
                    <span className="text-sm font-medium">{(average * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2.5">
                    <div 
                      className="bg-primary h-2.5 rounded-full" 
                      style={{ width: `${average * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Voice Analysis Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm mb-4">
            Top emotions detected in your voice during this conversation:
          </p>
          
          <ul className="list-disc pl-5 space-y-1">
            {emotionAverages.slice(0, 3).map(({ emotion, average }) => (
              <li key={emotion} className="text-sm">
                <span className="capitalize font-medium">{emotion}</span>:{' '}
                <span>{(average * 100).toFixed(1)}%</span>
              </li>
            ))}
          </ul>
          
          <div className="mt-4 text-sm text-muted-foreground">
            <p>
              These emotions were detected from {emotionMessages.length} voice samples
              throughout the conversation.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 