import { v } from "convex/values";
import { mutation, query, action, internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { QueryCtx } from "./_generated/server";
import { api } from "./_generated/api";

// Helper function to normalize data between Hume and Convex
function normalizeHumeEvent(event: any): Message {
  return {
    type: event.type || "SYSTEM_MESSAGE",
    role: (typeof event.role === 'string' ? event.role.toUpperCase() : event.role) || "SYSTEM",
    messageText: event.messageText || event.content || "",
    content: event.content || event.messageText || "",
    timestamp: event.timestamp || Date.now(),
    emotionFeatures: event.emotionFeatures,
    chatId: event.chatId,
    chatGroupId: event.chatGroupId,
    metadata: event.metadata || (event.chatId && event.chatGroupId ? {
      chat_id: event.chatId,
      chat_group_id: event.chatGroupId,
      request_id: crypto.randomUUID(),
      timestamp: new Date(event.timestamp || Date.now()).toISOString()
    } : undefined)
  };
}

// Helper function to check if user has access to chat
async function checkUserChatAccess(ctx: QueryCtx, userId: string) {
    // Get user details
    const user = await ctx.db
        .query("users")
        .withIndex("by_token", (q) => q.eq("tokenIdentifier", userId))
        .unique();
    
    if (!user) {
        throw new Error("User not found");
    }
    
    // Get user's plan
    const planKey = user.currentPlanKey || "free"; // Default to free plan if not set
    
    const plan = await ctx.db
        .query("plans")
        .withIndex("key", (q) => q.eq("key", planKey))
        .unique();
    
    if (!plan) {
        throw new Error("Plan not found");
    }
    
    // For free plan, no limits
    if (planKey === "free") {
        return {
            hasAccess: true,
            maxSessionDurationMinutes: undefined, // No time limit
            minutesRemaining: undefined // No minutes limit
        };
    }
    
    // For paid plans, check if user has minutes remaining
    if (user.minutesRemaining !== undefined && user.minutesRemaining <= 0) {
        return {
            hasAccess: false,
            reason: "You have used all your available minutes. Please upgrade your plan to continue.",
            upgradeRequired: true,
            limitType: "minutes"
        };
    }
    
    return {
        hasAccess: true,
        maxSessionDurationMinutes: plan.maxSessionDurationMinutes,
        minutesRemaining: user.minutesRemaining
    };
}

// New mutation to update user's remaining minutes
export const updateUserRemainingMinutes = mutation({
    args: {
        sessionDurationMinutes: v.number(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Not authenticated");
        }

        const userId = identity.subject;
        console.log(`Updating minutes for user ${userId}, duration: ${args.sessionDurationMinutes} minutes`);
        
        // Get user details
        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) => q.eq("tokenIdentifier", userId))
            .unique();
        
        if (!user) {
            throw new Error("User not found");
        }
        
        // Get user's plan
        const planKey = user.currentPlanKey || "free";
        const plan = await ctx.db
            .query("plans")
            .withIndex("key", (q) => q.eq("key", planKey))
            .unique();
            
        if (!plan) {
            console.error(`Plan ${planKey} not found for user ${userId}`);
        }
        
        // Calculate new remaining minutes
        const currentMinutesRemaining = user.minutesRemaining || 0;
        const newMinutesRemaining = Math.max(0, currentMinutesRemaining - args.sessionDurationMinutes);
        
        console.log(`User ${userId} minutes: ${currentMinutesRemaining} -> ${newMinutesRemaining} (deducted ${args.sessionDurationMinutes})`);
        console.log(`User plan: ${planKey}, total allowed: ${user.totalMinutesAllowed || 0}`);
        
        // Update user's remaining minutes
        await ctx.db.patch(user._id, {
            minutesRemaining: newMinutesRemaining,
        });
        
        return {
            success: true,
            previousMinutesRemaining: currentMinutesRemaining,
            newMinutesRemaining: newMinutesRemaining,
            minutesUsed: args.sessionDurationMinutes,
            planKey: planKey,
            totalMinutesAllowed: user.totalMinutesAllowed
        };
    },
});

type MessageType = "USER_MESSAGE" | "AGENT_MESSAGE" | "SYSTEM_MESSAGE" | "CHAT_METADATA";
type MessageRole = "USER" | "ASSISTANT" | "SYSTEM";

interface MessageMetadata {
    chat_id: string;
    chat_group_id: string;
    request_id: string;
    timestamp: string;
}

interface Message {
    type: MessageType;
    role: MessageRole;
    messageText: string;
    content?: string;
    timestamp: number;
    emotionFeatures?: string;
    chatId?: string;
    chatGroupId?: string;
    metadata?: MessageMetadata;
}

// Define the base event type
type BaseEvent = Message;

// Helper function to validate and normalize event type
function validateEventType(type: string): "USER_MESSAGE" | "AGENT_MESSAGE" | "SYSTEM_MESSAGE" | "CHAT_METADATA" {
    const validTypes = ["USER_MESSAGE", "AGENT_MESSAGE", "SYSTEM_MESSAGE", "CHAT_METADATA"] as const;
    if (!validTypes.includes(type as any)) {
        throw new Error(`Invalid event type: ${type}`);
    }
    return type as "USER_MESSAGE" | "AGENT_MESSAGE" | "SYSTEM_MESSAGE" | "CHAT_METADATA";
}

// Helper function to validate and normalize role
function validateRole(role: string): "USER" | "ASSISTANT" | "SYSTEM" {
    const validRoles = ["USER", "ASSISTANT", "SYSTEM"] as const;
    if (!validRoles.includes(role as any)) {
        throw new Error(`Invalid role: ${role}`);
    }
    return role as "USER" | "ASSISTANT" | "SYSTEM";
}

// Base message fields for type checking
export const baseMessageFields = {
  type: v.union(
    v.literal("USER_MESSAGE"),
    v.literal("AGENT_MESSAGE"),
    v.literal("SYSTEM_MESSAGE"),
    v.literal("CHAT_METADATA")
  ),
  role: v.union(
    v.literal("USER"),
    v.literal("ASSISTANT"),
    v.literal("SYSTEM"),
    v.literal("user"),
    v.literal("assistant")
  ),
  messageText: v.string(),
  content: v.optional(v.string()),
  timestamp: v.float64(),
  emotionFeatures: v.optional(v.string()),
  chatId: v.optional(v.string()),
  chatGroupId: v.optional(v.string()),
  metadata: v.optional(
    v.object({
      chat_id: v.string(),
      chat_group_id: v.string(),
      request_id: v.string(),
      timestamp: v.string()
    })
  )
};

// Define message validator matches schema
export const messageValidator = v.object({
  ...baseMessageFields,
});

// Helper function to format a message
function formatMessage(
    type: MessageType,
    role: MessageRole,
    messageText: string,
    chatId?: string,
    chatGroupId?: string,
    emotionFeatures?: string
): Message {
    const message: Message = {
        type,
        role,
        messageText,
        timestamp: Date.now(),
    };

    if (emotionFeatures) {
        message.emotionFeatures = emotionFeatures;
    }

    if (chatId && chatGroupId) {
        message.chatId = chatId;
        message.chatGroupId = chatGroupId;
        message.metadata = {
            chat_id: chatId,
            chat_group_id: chatGroupId,
            request_id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
        };
    }

    return message;
}

// Add ChatEvent type to match Hume.ai's EVI
export type ChatEvent = {
    type: "USER_MESSAGE" | "AGENT_MESSAGE" | "SYSTEM_MESSAGE" | "CHAT_METADATA";
    role: "USER" | "ASSISTANT" | "SYSTEM";
    messageText: string;
    content?: string;
    timestamp: number;
    emotionFeatures?: string;
    chatId?: string;
    chatGroupId?: string;
};

// Update the chat history table schema
export interface ChatSession {
    userId: string;
    chatId: string;  // Previously sessionId
    chatGroupId: string;  // New field to link related sessions
    events: ChatEvent[];  // Store standardized events instead of custom messages
    messages: Message[];  // Store messages in the same format
    createdAt: number;
    updatedAt: number;
    title?: string;
}

// Helper to convert our Message type to ChatEvent
function messageToEvent(message: Message, chatId?: string, chatGroupId?: string): ChatEvent {
    return {
        type: message.type,
        role: message.role.toUpperCase() as "USER" | "ASSISTANT" | "SYSTEM",
        messageText: message.messageText,
        content: message.content,
        timestamp: message.timestamp,
        emotionFeatures: message.emotionFeatures ? JSON.stringify(message.emotionFeatures) : undefined,
        chatId: chatId || message.chatId,
        chatGroupId: chatGroupId || message.chatGroupId
    };
}

// Update createChatSession to handle chat groups
export const createChatSession = mutation({
    args: {
        initialMessage: v.object({
            type: v.union(
                v.literal("USER_MESSAGE"),
                v.literal("AGENT_MESSAGE"),
                v.literal("SYSTEM_MESSAGE"),
                v.literal("CHAT_METADATA")
            ),
            role: v.union(
                v.literal("USER"),
                v.literal("ASSISTANT"),
                v.literal("SYSTEM")
            ),
            messageText: v.string(),
            content: v.optional(v.string()),
            timestamp: v.number(),
            emotionFeatures: v.optional(v.string()),
        }),
        chatId: v.optional(v.string()),
        chatGroupId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Not authenticated");
        }

        const userId = identity.subject;
        const sessionId = crypto.randomUUID();

        // Create message without chatId and chatGroupId initially
        // These will be populated later by updateHumeChatIds
        const message: Message = {
            type: args.initialMessage.type as MessageType,
            role: args.initialMessage.role as MessageRole,
            messageText: args.initialMessage.messageText,
            content: args.initialMessage.content,
            timestamp: args.initialMessage.timestamp,
            emotionFeatures: args.initialMessage.emotionFeatures,
        };

        // Only set chatId and chatGroupId if explicitly provided in args
        // Don't auto-generate them
        if (args.chatId && args.chatGroupId) {
            message.chatId = args.chatId;
            message.chatGroupId = args.chatGroupId;
            message.metadata = {
                chat_id: args.chatId,
                chat_group_id: args.chatGroupId,
                request_id: crypto.randomUUID(),
                timestamp: new Date().toISOString(),
            };
        }

        await ctx.db.insert("chatHistory", {
            userId,
            sessionId,
            messages: [message],
            events: [message],
            // Only include chatId and chatGroupId if explicitly provided
            ...(args.chatId && { chatId: args.chatId }),
            ...(args.chatGroupId && { chatGroupId: args.chatGroupId }),
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });

        return { sessionId, message };
    },
});

// Update addMessageToSession to use events
export const addMessageToSession = mutation({
    args: {
        sessionId: v.string(),
        message: v.object({
            type: v.union(
                v.literal("USER_MESSAGE"),
                v.literal("AGENT_MESSAGE"),
                v.literal("SYSTEM_MESSAGE"),
                v.literal("CHAT_METADATA")
            ),
            role: v.union(
                v.literal("USER"),
                v.literal("ASSISTANT"),
                v.literal("SYSTEM"),
                v.literal("user"),
                v.literal("assistant")
            ),
            messageText: v.string(),
            content: v.optional(v.string()),
            timestamp: v.number(),
            emotionFeatures: v.optional(v.string()),
            chatId: v.optional(v.string()),
            chatGroupId: v.optional(v.string())
        })
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Not authenticated");
        }

        const userId = identity.subject;

        // Find the chat session by either sessionId or chatId
        const session = await ctx.db
            .query("chatHistory")
            .filter((q) => q.eq(q.field("userId"), userId))
            .filter((q) => 
                q.or(
                    q.eq(q.field("sessionId"), args.sessionId),
                    q.eq(q.field("chatId"), args.sessionId)
                )
            )
            .first();

        if (!session) {
            throw new Error("Chat session not found");
        }

        // Convert role to uppercase if it's in lowercase
        const role = typeof args.message.role === 'string' && 
            (args.message.role === 'user' || args.message.role === 'assistant') ? 
            args.message.role.toUpperCase() as MessageRole : 
            args.message.role as MessageRole;

        // Normalize the message using our helper function
        const normalizedMessage: Message = normalizeHumeEvent({
            ...args.message,
            role,
            chatId: args.message.chatId || session.chatId,
            chatGroupId: args.message.chatGroupId || session.chatGroupId,
        });

        // Add metadata if chatId and chatGroupId are available
        if (normalizedMessage.chatId && normalizedMessage.chatGroupId) {
            normalizedMessage.metadata = {
                chat_id: normalizedMessage.chatId,
                chat_group_id: normalizedMessage.chatGroupId,
                request_id: crypto.randomUUID(),
                timestamp: new Date(args.message.timestamp).toISOString()
            };
        }

        // Add the new message to both messages and events arrays
        const updatedMessages = [...(session.messages || []), normalizedMessage];
        const updatedEvents = [...(session.events || []), normalizedMessage];

        // Update the session with the new message
        await ctx.db.patch(session._id, {
            messages: updatedMessages,
            events: updatedEvents,
            updatedAt: Date.now()
        });

        return {
            success: true,
            sessionId: args.sessionId,
            messageId: normalizedMessage.metadata?.request_id || crypto.randomUUID()
        };
    }
});

export const getChatSessions = query({
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Not authenticated");
        }

        const userId = identity.subject;

        const sessions = await ctx.db
            .query("chatHistory")
            .filter((q) => q.eq(q.field("userId"), userId))
            .order("desc")
            .collect();

        return sessions;
    },
});

export const getChatSession = query({
    args: { 
        sessionId: v.string(),
        chatId: v.optional(v.string()) // Add optional chatId for backward compatibility
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Not authenticated");
        }

        const userId = identity.subject;
        
        // Use either chatId or sessionId (for backward compatibility)
        const sessionIdentifier = args.chatId || args.sessionId;

        const session = await ctx.db
            .query("chatHistory")
            .filter((q) => q.eq(q.field("userId"), userId))
            .filter((q) => q.eq(q.field("sessionId"), sessionIdentifier))
            .first();

        if (!session) {
            throw new Error("Chat session not found");
        }

        return session;
    },
});

export const deleteChat = mutation({
    args: { id: v.id("chatHistory") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Not authenticated");
        }

        const userId = identity.subject;

        // Get the chat to verify ownership
        const chat = await ctx.db.get(args.id);
        if (!chat) {
            throw new Error("Chat not found");
        }

        // Verify the user owns this chat
        if (chat.userId !== userId) {
            throw new Error("Not authorized to delete this chat");
        }

        // Delete the chat
        await ctx.db.delete(args.id);
        return true;
    },
});

export const renameChat = mutation({
    args: {
        id: v.id("chatHistory"),
        title: v.string(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Not authenticated");
        }

        const userId = identity.subject;

        // Get the chat session
        const chatSession = await ctx.db.get(args.id);
        if (!chatSession) {
            throw new Error("Chat session not found");
        }

        // Verify ownership
        if (chatSession.userId !== userId) {
            throw new Error("Not authorized to rename this chat");
        }

        // Update the chat title
        await ctx.db.patch(args.id, {
            title: args.title,
            updatedAt: Date.now(),
        });

        return {
            success: true,
            id: args.id,
            title: args.title,
        };
    },
});

// Debug function to get all chat history - for admin use only
export const getAllChatHistory = query({
    handler: async (ctx) => {
        // This function should only be used for debugging purposes
        // In a production environment, you would want to add authentication checks
        
        return await ctx.db
            .query("chatHistory")
            .collect();
    },
});

export const cleanupEmptySessions = mutation({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Not authenticated");
        }

        const userId = identity.subject;
        const emptySessions = await ctx.db
            .query("chatHistory")
            .filter(q => q.eq(q.field("userId"), userId))
            .collect();
            
        let deletedCount = 0;
        for (const session of emptySessions) {
            if (!session.messages || session.messages.length === 0) {
                await ctx.db.delete(session._id);
                deletedCount++;
            }
        }
        
        return `Deleted ${deletedCount} empty sessions`;
    },
});

export const adminCleanupEmptySessions = mutation({
    args: { userId: v.string() },
    handler: async (ctx, args) => {
        const emptySessions = await ctx.db
            .query("chatHistory")
            .filter(q => q.eq(q.field("userId"), args.userId))
            .collect();
            
        let deletedCount = 0;
        for (const session of emptySessions) {
            if (!session.messages || session.messages.length === 0) {
                await ctx.db.delete(session._id);
                deletedCount++;
            }
        }
        
        return `Deleted ${deletedCount} empty sessions`;
    },
});

export const updateHumeChatIds = mutation({
    args: {
        sessionId: v.string(),
        chatId: v.string(),
        chatGroupId: v.string(),
        metadata: v.optional(
            v.object({
                chat_id: v.string(),
                chat_group_id: v.string(),
                request_id: v.string(),
                timestamp: v.string(),
            })
        ),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Not authenticated");
        }

        const userId = identity.subject;

        // Try several approaches to find the chat session
        
        // 1. First, try to find by the exact sessionId (traditional way)
        let chatSession = await ctx.db
            .query("chatHistory")
            .filter((q) => q.eq(q.field("userId"), userId))
            .filter((q) => q.eq(q.field("sessionId"), args.sessionId))
            .first();

        // 2. If not found, try to find by chatId (in case they got mixed up)
        if (!chatSession) {
            chatSession = await ctx.db
                .query("chatHistory")
                .filter((q) => q.eq(q.field("userId"), userId))
                .filter((q) => q.eq(q.field("chatId"), args.sessionId))
                .first();
            
            if (chatSession) {
                console.log("Found session by chatId instead of sessionId");
            }
        }

        // 3. If still not found, try to get the most recent session for this user
        if (!chatSession) {
            chatSession = await ctx.db
                .query("chatHistory")
                .filter((q) => q.eq(q.field("userId"), userId))
                .order("desc")
                .first();
            
            if (chatSession) {
                console.log("Using most recent session as fallback");
            }
        }

        if (!chatSession) {
            throw new Error("Chat session not found - tried sessionId, chatId, and recent sessions");
        }

        // Update the chat session with the new IDs
        await ctx.db.patch(chatSession._id, {
            chatId: args.chatId,
            chatGroupId: args.chatGroupId,
            updatedAt: Date.now(),
        });

        return {
            success: true,
            sessionId: args.sessionId,
            actualSessionId: chatSession.sessionId,
        };
    },
});

export const getActiveConversation = query({
  args: { chatId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get chat from chatHistory table using either chatId or sessionId
    const chat = await ctx.db
      .query("chatHistory")
      .filter((q) => 
        q.and(
          q.eq(q.field("userId"), identity.subject),
          q.or(
            q.eq(q.field("sessionId"), args.chatId),
            q.eq(q.field("chatId"), args.chatId)
          )
        )
      )
      .first();

    if (!chat) {
      // Instead of throwing error, return null to handle gracefully in UI
      return null;
    }

    // Convert events to messages if needed
    const messages = chat.messages || chat.events?.map(event => ({
      type: event.type,
      role: event.role,
      content: event.messageText,
      timestamp: event.timestamp,
      emotionFeatures: event.emotionFeatures,
      chatId: event.chatId,
      chatGroupId: event.chatGroupId,
      metadata: {
        chat_id: event.chatId,
        chat_group_id: event.chatGroupId,
        request_id: event.chatId,
        timestamp: new Date(event.timestamp).toISOString()
      }
    })) || [];

    return {
      userId: identity.subject,
      chatId: chat.chatId || chat.sessionId, // Use chatId if available, fallback to sessionId
      chatGroupId: chat.chatGroupId,
      messages,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
      title: chat.title
    };
  },
});

export const saveConversationTranscript = mutation({
    args: {
        sessionId: v.string(),
        messages: v.array(
            v.object({
                type: v.union(
                    v.literal("USER_MESSAGE"),
                    v.literal("AGENT_MESSAGE"),
                    v.literal("SYSTEM_MESSAGE"),
                    v.literal("CHAT_METADATA")
                ),
                role: v.union(
                    v.literal("USER"),
                    v.literal("ASSISTANT"),
                    v.literal("SYSTEM")
                ),
                messageText: v.string(),
                content: v.optional(v.string()),
                timestamp: v.number(),
                emotionFeatures: v.optional(v.string()),
                chatId: v.optional(v.string()),
                chatGroupId: v.optional(v.string()),
                metadata: v.optional(
                    v.object({
                        chat_id: v.string(),
                        chat_group_id: v.string(),
                        request_id: v.string(),
                        timestamp: v.string(),
                    })
                ),
            })
        ),
        events: v.array(
            v.object({
                type: v.union(
                    v.literal("USER_MESSAGE"),
                    v.literal("AGENT_MESSAGE"),
                    v.literal("SYSTEM_MESSAGE"),
                    v.literal("CHAT_METADATA")
                ),
                role: v.union(
                    v.literal("USER"),
                    v.literal("ASSISTANT"),
                    v.literal("SYSTEM")
                ),
                messageText: v.string(),
                content: v.optional(v.string()),
                timestamp: v.number(),
                emotionFeatures: v.optional(v.string()),
                chatId: v.optional(v.string()),
                chatGroupId: v.optional(v.string()),
                metadata: v.optional(
                    v.object({
                        chat_id: v.string(),
                        chat_group_id: v.string(),
                        request_id: v.string(),
                        timestamp: v.string(),
                    })
                ),
            })
        ),
        chatId: v.optional(v.string()),
        chatGroupId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Not authenticated");
        }

        const userId = identity.subject;
        
        console.log(`📝 saveConversationTranscript called with:`, {
            sessionId: args.sessionId,
            chatId: args.chatId,
            chatGroupId: args.chatGroupId,
            messagesCount: args.messages.length,
            eventsCount: args.events.length
        });

        // Try multiple approaches to find the chat session
        let chatSession;
        
        // 1. First try by the exact sessionId
        chatSession = await ctx.db
            .query("chatHistory")
            .filter((q) => q.eq(q.field("userId"), userId))
            .filter((q) => q.eq(q.field("sessionId"), args.sessionId))
            .first();
            
        if (chatSession) {
            console.log(`✅ Found session by sessionId: ${args.sessionId}`);
        }

        // 2. If not found, try using the chatId parameter if provided
        if (!chatSession && args.chatId) {
            console.log(`⚠️ Session not found by sessionId, trying chatId: ${args.chatId}`);
            chatSession = await ctx.db
                .query("chatHistory")
                .filter((q) => q.eq(q.field("userId"), userId))
                .filter((q) => q.eq(q.field("chatId"), args.chatId))
                .first();
                
            if (chatSession) {
                console.log(`✅ Found session by chatId: ${args.chatId} -> sessionId: ${chatSession.sessionId}`);
            }
        }
        
        // 3. If still not found, try using chatGroupId parameter if provided
        if (!chatSession && args.chatGroupId) {
            console.log(`⚠️ Session not found by chatId, trying chatGroupId: ${args.chatGroupId}`);
            chatSession = await ctx.db
                .query("chatHistory")
                .filter((q) => q.eq(q.field("userId"), userId))
                .filter((q) => q.eq(q.field("chatGroupId"), args.chatGroupId))
                .first();
                
            if (chatSession) {
                console.log(`✅ Found session by chatGroupId: ${args.chatGroupId} -> sessionId: ${chatSession.sessionId}`);
            }
        }
        
        // 4. Try looking through the first message's chatId if available
        if (!chatSession && args.events.length > 0 && args.events[0].chatId) {
            const firstEventChatId = args.events[0].chatId;
            console.log(`⚠️ Session not found by params, trying first event chatId: ${firstEventChatId}`);
            
            chatSession = await ctx.db
                .query("chatHistory")
                .filter((q) => q.eq(q.field("userId"), userId))
                .filter((q) => q.eq(q.field("chatId"), firstEventChatId))
                .first();
                
            if (chatSession) {
                console.log(`✅ Found session by first event chatId: ${firstEventChatId} -> sessionId: ${chatSession.sessionId}`);
            }
        }
        
        // 5. As a last resort, get the most recent session
        if (!chatSession) {
            console.log(`⚠️ Session not found by any id, trying most recent session`);
            chatSession = await ctx.db
                .query("chatHistory")
                .filter((q) => q.eq(q.field("userId"), userId))
                .order("desc")
                .first();
                
            if (chatSession) {
                console.log(`✅ Using most recent session as fallback: ${chatSession.sessionId}`);
            } else {
                console.error(`❌ No session found for user, cannot save transcript`);
                throw new Error("Chat session not found - no sessions available for this user");
            }
        }

        // If messages is empty but events is populated, use events for both
        const messages = args.messages.length > 0 ? args.messages : args.events;
        
        // Update the chat history
        await ctx.db.patch(chatSession._id, {
            messages: messages,
            events: args.events,
            chatId: args.chatId || chatSession.chatId,
            chatGroupId: args.chatGroupId || chatSession.chatGroupId,
            updatedAt: Date.now(),
        });
        
        console.log(`✅ Successfully saved transcript to session: ${chatSession.sessionId}`);

        return { 
            success: true,
            sessionId: chatSession.sessionId,
            actualSessionId: chatSession.sessionId 
        };
    },
});

// Function to add an event to a session
export const addEventToSession = mutation({
    args: {
        sessionId: v.string(),
        event: v.object({
            type: v.union(
                v.literal("USER_MESSAGE"),
                v.literal("AGENT_MESSAGE"),
                v.literal("SYSTEM_MESSAGE"),
                v.literal("CHAT_METADATA")
            ),
            role: v.union(
                v.literal("USER"),
                v.literal("ASSISTANT"),
                v.literal("SYSTEM")
            ),
            messageText: v.string(),
            content: v.optional(v.string()),
            timestamp: v.number(),
            emotionFeatures: v.optional(v.string()),
            chatId: v.optional(v.string()),
            chatGroupId: v.optional(v.string()),
            metadata: v.optional(v.object({
                chat_id: v.string(),
                chat_group_id: v.string(),
                request_id: v.string(),
                timestamp: v.string(),
            })),
        }),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Not authenticated");
        }

        const userId = identity.subject;

        // Get the chat session
        const chatSession = await ctx.db
            .query("chatHistory")
            .filter((q) => q.eq(q.field("userId"), userId))
            .filter((q) => q.eq(q.field("sessionId"), args.sessionId))
            .first();

        if (!chatSession) {
            throw new Error("Chat session not found");
        }

        // Format the event to match the Message interface
        const formattedEvent: Message = {
            type: args.event.type as MessageType,
            role: args.event.role as MessageRole,
            messageText: args.event.messageText,
            content: args.event.content,
            timestamp: args.event.timestamp,
            emotionFeatures: args.event.emotionFeatures,
            chatId: args.event.chatId,
            chatGroupId: args.event.chatGroupId,
        };

        // Add metadata if it exists or create it if chatId and chatGroupId are available
        if (args.event.metadata) {
            formattedEvent.metadata = args.event.metadata;
        } else if (formattedEvent.chatId && formattedEvent.chatGroupId) {
            formattedEvent.metadata = {
                chat_id: formattedEvent.chatId,
                chat_group_id: formattedEvent.chatGroupId,
                request_id: crypto.randomUUID(),
                timestamp: new Date(args.event.timestamp).toISOString(),
            };
        }

        // Update the chat session with the new event
        await ctx.db.patch(chatSession._id, {
            events: [...(chatSession.events || []), formattedEvent],
            messages: [...(chatSession.messages || []), formattedEvent],
            updatedAt: Date.now(),
        });

        return {
            success: true,
            sessionId: args.sessionId,
        };
    },
});

export const updateMetadata = mutation({
    args: {
        sessionId: v.string(),
        chatId: v.string(),
        chatGroupId: v.string(),
        requestId: v.string(),
        receivedAt: v.string(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Not authenticated");
        }

        const userId = identity.subject;

        // Get the chat session - try multiple approaches
        let session;

        // 1. Try by sessionId
        session = await ctx.db
            .query("chatHistory")
            .filter((q) => q.eq(q.field("userId"), userId))
            .filter((q) => q.eq(q.field("sessionId"), args.sessionId))
            .first();

        // 2. If not found, try by chatId
        if (!session) {
            session = await ctx.db
                .query("chatHistory")
                .filter((q) => q.eq(q.field("userId"), userId))
                .filter((q) => q.eq(q.field("chatId"), args.chatId))
                .first();
        }

        // 3. If still not found, try by chatGroupId
        if (!session) {
            session = await ctx.db
                .query("chatHistory")
                .filter((q) => q.eq(q.field("userId"), userId))
                .filter((q) => q.eq(q.field("chatGroupId"), args.chatGroupId))
                .first();
        }

        // 4. If still not found, create a new session
        if (!session) {
            const newSessionId = await ctx.db.insert("chatHistory", {
                userId,
                sessionId: args.sessionId,
                chatId: args.chatId,
                chatGroupId: args.chatGroupId,
                messages: [],
                events: [],
                createdAt: Date.now(),
                updatedAt: Date.now()
            });
            session = await ctx.db.get(newSessionId);
            
            // If we still don't have a session after creating it, something went wrong
            if (!session) {
                throw new Error("Failed to create or retrieve chat session");
            }
        }

        // Convert receivedAt string to a timestamp number if it's an ISO string
        const timestamp = args.receivedAt.match(/^\d+$/) ? 
            args.receivedAt : // If it's already a numeric string, use it as is
            Date.parse(args.receivedAt) || Date.now().toString(); // Otherwise parse ISO string or use current time

        // Update both top-level fields and metadata consistently
        const updateData = {
            chatId: args.chatId,
            chatGroupId: args.chatGroupId,
            updatedAt: Date.now()
        };

        // Update the session with the new metadata
        await ctx.db.patch(session._id, updateData);

        // Also update any existing messages and events to maintain consistency
        const messages = session.messages || [];
        const events = session.events || [];

        console.log(`📝 Updating ${messages.length} messages and ${events.length} events`);

        const updatedMessages = messages.map(msg => ({
            ...msg,
            chatId: args.chatId,
            chatGroupId: args.chatGroupId,
        }));

        const updatedEvents = events.map(event => ({
            ...event,
            chatId: args.chatId,
            chatGroupId: args.chatGroupId,
        }));

        // Update messages and events
        await ctx.db.patch(session._id, {
            messages: updatedMessages,
            events: updatedEvents
        });

        return {
            success: true,
            sessionId: args.sessionId,
        };
    }
});

// New function to help with debugging and ensuring metadata updates correctly
export const updateAndVerifyMetadata = mutation({
    args: {
        sessionId: v.string(),
        chatId: v.string(),
        chatGroupId: v.string(),
        requestId: v.string(),
        receivedAt: v.string(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Not authenticated");
        }

        const userId = identity.subject;
        
        console.log(`🔄 updateAndVerifyMetadata called with:`, {
            sessionId: args.sessionId,
            chatId: args.chatId,
            chatGroupId: args.chatGroupId,
            requestId: args.requestId,
            receivedAt: args.receivedAt
        });

        // Try multiple approaches to find the session
        let sessionBefore;
        
        // 1. First try by sessionId (traditional approach)
        sessionBefore = await ctx.db
            .query("chatHistory")
            .filter((q) => q.eq(q.field("userId"), userId))
            .filter((q) => q.eq(q.field("sessionId"), args.sessionId))
            .first();
            
        // 2. If not found by sessionId, try by chatId
        if (!sessionBefore) {
            console.log(`⚠️ Session not found by sessionId ${args.sessionId}, trying chatId ${args.chatId}`);
            sessionBefore = await ctx.db
                .query("chatHistory")
                .filter((q) => q.eq(q.field("userId"), userId))
                .filter((q) => q.eq(q.field("chatId"), args.chatId))
                .first();
                
            if (sessionBefore) {
                console.log(`✅ Found session using chatId instead: ${sessionBefore.sessionId}`);
            }
        }
        
        // 3. If still not found, try by chatGroupId
        if (!sessionBefore) {
            console.log(`⚠️ Session not found by chatId, trying chatGroupId ${args.chatGroupId}`);
            sessionBefore = await ctx.db
                .query("chatHistory")
                .filter((q) => q.eq(q.field("userId"), userId))
                .filter((q) => q.eq(q.field("chatGroupId"), args.chatGroupId))
                .first();
                
            if (sessionBefore) {
                console.log(`✅ Found session using chatGroupId instead: ${sessionBefore.sessionId}`);
            }
        }
        
        // 4. If still not found, try to get the most recent session as last resort
        if (!sessionBefore) {
            console.log(`⚠️ Session not found by any ID, trying most recent session`);
            sessionBefore = await ctx.db
                .query("chatHistory")
                .filter((q) => q.eq(q.field("userId"), userId))
                .order("desc")
                .first();
                
            if (sessionBefore) {
                console.log(`✅ Using most recent session as fallback: ${sessionBefore.sessionId}`);
            }
        }

        if (!sessionBefore) {
            console.error(`❌ Chat session not found after trying all approaches`);
            throw new Error("Chat session not found after trying all approaches");
        }
        
        console.log(`ℹ️ Session BEFORE update:`, {
            sessionId: sessionBefore.sessionId,
            chatId: sessionBefore.chatId,
            chatGroupId: sessionBefore.chatGroupId
        });

        // Convert receivedAt string to a timestamp number if it's an ISO string
        const timestamp = args.receivedAt.match(/^\d+$/) ? 
            args.receivedAt : // If it's already a numeric string, use it as is
            Date.parse(args.receivedAt) || Date.now().toString(); // Otherwise parse ISO string or use current time

        // Update both top-level fields and metadata consistently
        const updateData = {
            chatId: args.chatId,
            chatGroupId: args.chatGroupId,
            updatedAt: Date.now()
        };

        console.log(`🔧 Applying update with data:`, updateData);

        // Update the session with the new metadata
        await ctx.db.patch(sessionBefore._id, updateData);

        // Also update any existing messages and events to maintain consistency
        const messages = sessionBefore.messages || [];
        const events = sessionBefore.events || [];

        console.log(`📝 Updating ${messages.length} messages and ${events.length} events`);

        const updatedMessages = messages.map(msg => ({
            ...msg,
            chatId: args.chatId,
            chatGroupId: args.chatGroupId,
        }));

        const updatedEvents = events.map(event => ({
            ...event,
            chatId: args.chatId,
            chatGroupId: args.chatGroupId,
        }));

        // Update messages and events
        await ctx.db.patch(sessionBefore._id, {
            messages: updatedMessages,
            events: updatedEvents
        });

        return {
            success: true,
            sessionId: args.sessionId,
        };
    },
});

// Debug function to get chat session info
export const debugGetChatSession = query({
  args: {
    sessionId: v.string(),
    chatId: v.optional(v.string()),
    chatGroupId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { sessionId, chatId, chatGroupId } = args;
    
    // First try by sessionId
    const byId = await ctx.db
      .query("chatHistory")
      .filter((q) => q.eq(q.field("sessionId"), sessionId))
      .first();
      
    if (byId) {
      return {
        found: true,
        foundBy: "sessionId",
        sessionId: byId._id,
        chatId: byId.chatId,
        chatGroupId: byId.chatGroupId,
      };
    }
    
    // Then try by chatId if provided
    if (chatId) {
      const byChatId = await ctx.db
        .query("chatHistory")
        .filter((q) => q.eq(q.field("chatId"), chatId))
        .first();
        
      if (byChatId) {
        return {
          found: true,
          foundBy: "chatId",
          sessionId: byChatId._id,
          chatId: byChatId.chatId,
          chatGroupId: byChatId.chatGroupId,
        };
      }
    }
    
    // Finally try by chatGroupId if provided
    if (chatGroupId) {
      const byGroupId = await ctx.db
        .query("chatHistory")
        .filter((q) => q.eq(q.field("chatGroupId"), chatGroupId))
        .first();
        
      if (byGroupId) {
        return {
          found: true,
          foundBy: "chatGroupId",
          sessionId: byGroupId._id,
          chatId: byGroupId.chatId,
          chatGroupId: byGroupId.chatGroupId,
        };
      }
    }
    
    return {
      found: false,
      sessionId,
      chatId,
      chatGroupId,
    };
  },
});

// Query to lookup a session by chat IDs (for troubleshooting session mismatches)
export const lookupByChatIds = query({
  args: {
    chatId: v.optional(v.string()),
    chatGroupId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { chatId, chatGroupId } = args;
    
    // Need at least one ID to search
    if (!chatId && !chatGroupId) {
      return { found: false, error: "No search criteria provided" };
    }
    
    // First try to find by chatId
    if (chatId) {
      const sessionByChatId = await ctx.db
        .query("chatHistory")
        .filter((q) => q.eq(q.field("chatId"), chatId))
        .first();
      
      if (sessionByChatId) {
        return {
          found: true,
          foundBy: "chatId",
          sessionId: sessionByChatId._id,
          chatId: sessionByChatId.chatId,
          chatGroupId: sessionByChatId.chatGroupId,
        };
      }
    }
    
    // Next try to find by chatGroupId
    if (chatGroupId) {
      const sessionByGroupId = await ctx.db
        .query("chatHistory")
        .filter((q) => q.eq(q.field("chatGroupId"), chatGroupId))
        .first();
      
      if (sessionByGroupId) {
        return {
          found: true,
          foundBy: "chatGroupId",
          sessionId: sessionByGroupId._id,
          chatId: sessionByGroupId.chatId,
          chatGroupId: sessionByGroupId.chatGroupId,
        };
      }
    }
    
    // Not found by either ID
    return { found: false };
  },
});

// Add a new mutation to create a session with Hume IDs
export const createSessionWithHumeIds = mutation({
    args: {
        chatId: v.string(),
        chatGroupId: v.string(),
        initialMessage: v.object({
            type: v.union(
                v.literal("USER_MESSAGE"),
                v.literal("AGENT_MESSAGE"),
                v.literal("SYSTEM_MESSAGE"),
                v.literal("CHAT_METADATA")
            ),
            role: v.union(
                v.literal("USER"),
                v.literal("ASSISTANT"),
                v.literal("SYSTEM")
            ),
            messageText: v.string(),
            content: v.optional(v.string()),
            timestamp: v.number(),
            emotionFeatures: v.optional(v.string()),
        })
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Not authenticated");
        }

        const userId = identity.subject;
        
        // Generate a unique session ID that's different from the Hume IDs
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
        
        console.log(`Creating new session with Hume IDs: chatId=${args.chatId}, chatGroupId=${args.chatGroupId}`);

        // Create a message with the Hume IDs included
        const message = normalizeHumeEvent({
            type: args.initialMessage.type,
            role: args.initialMessage.role,
            messageText: args.initialMessage.messageText,
            content: args.initialMessage.content || args.initialMessage.messageText,
            timestamp: args.initialMessage.timestamp,
            emotionFeatures: args.initialMessage.emotionFeatures,
            chatId: args.chatId,
            chatGroupId: args.chatGroupId
        });

        // Insert the new session
        const id = await ctx.db.insert("chatHistory", {
            userId,
            sessionId,
            chatId: args.chatId,
            chatGroupId: args.chatGroupId,
            messages: [message],
            events: [message],
            createdAt: Date.now(),
            updatedAt: Date.now(),
            title: `Hume Chat ${new Date().toLocaleDateString()}`
        });
        
        console.log(`Created new session with ID: ${id}, sessionId: ${sessionId}`);

        return { 
            id,
            sessionId,
            message,
            chatId: args.chatId,
            chatGroupId: args.chatGroupId
        };
    },
});

// Save Hume chat history
export const saveHumeChatHistory = mutation({
  args: {
    chatId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    // Get existing chat history or create new one
    const chatHistory = await ctx.db
      .query("chatHistory")
      .withIndex("by_chat_id", (q) => q.eq("chatId", args.chatId))
      .unique();

    if (!chatHistory) {
      return {
        success: false,
        message: "Chat history not found"
      };
    }

    // Update the history with any new metadata
    await ctx.db.patch(chatHistory._id, {
      updatedAt: Date.now(),
    });

    return {
      success: true,
      messageCount: chatHistory.events?.length || 0,
      sessionId: chatHistory._id,
    };
  },
});
