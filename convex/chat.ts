import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { QueryCtx } from "./_generated/server";
import { api } from "./_generated/api";

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
    v.literal("SYSTEM")
  ),
  messageText: v.string(),
  content: v.optional(v.string()),
  timestamp: v.number(),
  emotionFeatures: v.optional(v.string()),
  chatId: v.optional(v.string()),
  chatGroupId: v.optional(v.string()),
};

// Define message validator matches schema
export const messageValidator = v.object({
  ...baseMessageFields,
  metadata: v.optional(
    v.object({
      chat_id: v.string(),
      chat_group_id: v.string(),
      request_id: v.string(),
      timestamp: v.string(),
    })
  ),
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

        const message: Message = {
            type: args.initialMessage.type as MessageType,
            role: args.initialMessage.role as MessageRole,
            messageText: args.initialMessage.messageText,
            content: args.initialMessage.content,
            timestamp: args.initialMessage.timestamp,
            emotionFeatures: args.initialMessage.emotionFeatures,
            chatId: args.chatId,
            chatGroupId: args.chatGroupId,
        };

        if (args.chatId && args.chatGroupId) {
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
            chatId: args.chatId,
            chatGroupId: args.chatGroupId,
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

        // Normalize the message and ensure all required fields are present
        const normalizedMessage: Message = {
            type: args.message.type as MessageType,
            role: role,
            messageText: args.message.messageText,
            content: args.message.content || args.message.messageText,
            timestamp: args.message.timestamp,
            emotionFeatures: args.message.emotionFeatures,
            chatId: args.message.chatId || session.chatId,
            chatGroupId: args.message.chatGroupId || session.chatGroupId,
        };

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
        metadata: v.optional(v.object({
            chat_id: v.string(),
            chat_group_id: v.string(),
            request_id: v.string(),
            timestamp: v.string(),
        })),
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

        // Update the chat session with the new IDs
        await ctx.db.patch(chatSession._id, {
            chatId: args.chatId,
            chatGroupId: args.chatGroupId,
            metadata: args.metadata || {
                chat_id: args.chatId,
                chat_group_id: args.chatGroupId,
                request_id: crypto.randomUUID(),
                timestamp: new Date().toISOString(),
            },
            updatedAt: Date.now(),
        });

        return {
            success: true,
            sessionId: args.sessionId,
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

        // Get the chat session
        const chatSession = await ctx.db
            .query("chatHistory")
            .filter((q) => q.eq(q.field("sessionId"), args.sessionId))
            .filter((q) => q.eq(q.field("userId"), userId))
            .first();

        if (!chatSession) {
            throw new Error("Chat session not found");
        }

        // Update the chat history
        await ctx.db.patch(chatSession._id, {
            messages: args.messages,
            events: args.events,
            chatId: args.chatId,
            chatGroupId: args.chatGroupId,
            updatedAt: Date.now(),
        });

        return { success: true };
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

        // Get the chat session
        const session = await ctx.db
            .query("chatHistory")
            .filter((q) => q.eq(q.field("userId"), userId))
            .filter((q) => q.eq(q.field("sessionId"), args.sessionId))
            .first();

        if (!session) {
            throw new Error("Chat session not found");
        }

        // Update the session with the new metadata
        await ctx.db.patch(session._id, {
            chatId: args.chatId,
            chatGroupId: args.chatGroupId,
            metadata: {
                chat_id: args.chatId,
                chat_group_id: args.chatGroupId,
                request_id: args.requestId,
                timestamp: args.receivedAt
            },
            updatedAt: Date.now()
        });

        return {
            success: true,
            sessionId: args.sessionId,
        };
    }
}); 