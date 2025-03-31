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

// Update the Message interface to match our schema
interface Message {
    type: string;
    role: string;
    messageText: string;
    timestamp: number;
    emotionFeatures?: any;
    chatId?: string;
    chatGroupId?: string;
    metadata?: {
        chat_id: string;
        chat_group_id: string;
        request_id: string;
        timestamp: string;
    };
}

// Helper function to format messages
function formatMessage(role: "user" | "assistant", content: string, emotions?: any, chatId?: string, chatGroupId?: string): Message {
    return {
        type: role === "user" ? "USER_MESSAGE" : "AGENT_MESSAGE",
        role: role.toUpperCase(),
        messageText: content,
        timestamp: Date.now(),
        emotionFeatures: emotions,
        chatId: chatId,
        chatGroupId: chatGroupId
    };
}

// Add ChatEvent type to match Hume.ai's EVI
export type ChatEvent = {
  type: "USER_MESSAGE" | "AGENT_MESSAGE" | "SYSTEM_MESSAGE";
  role: "USER" | "ASSISTANT" | "SYSTEM";
  messageText: string;
  timestamp: number;
  emotionFeatures?: string; // JSON stringified EmotionScores
  chatId: string;
  chatGroupId: string;
};

// Update the chat history table schema
export interface ChatSession {
  userId: string;
  chatId: string;  // Previously sessionId
  chatGroupId: string;  // New field to link related sessions
  events: ChatEvent[];  // Store standardized events instead of custom messages
  createdAt: number;
  updatedAt: number;
  title?: string;
}

// Helper to convert our Message type to ChatEvent
function messageToEvent(message: Message, chatId: string, chatGroupId: string): ChatEvent {
    return {
        type: message.role === "USER" ? "USER_MESSAGE" : 
              message.role === "ASSISTANT" ? "AGENT_MESSAGE" : "SYSTEM_MESSAGE",
        role: message.role as "USER" | "ASSISTANT" | "SYSTEM",
        messageText: message.messageText,
        timestamp: message.timestamp,
        emotionFeatures: message.emotionFeatures ? JSON.stringify(message.emotionFeatures) : undefined,
        chatId,
        chatGroupId
    };
}

// Update createChatSession to handle chat groups
export const createChatSession = mutation({
    args: {
        sessionId: v.optional(v.string()),
        initialMessage: v.optional(v.object({
            role: v.string(),
            content: v.string(),
        })),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Not authenticated");
        }

        const userId = identity.subject;
        const newSessionId = args.sessionId ?? crypto.randomUUID();

        // Check if a session with this sessionId already exists
        const existingSession = await ctx.db
            .query("chatHistory")
            .filter((q) => q.eq(q.field("userId"), userId))
            .filter((q) => q.eq(q.field("sessionId"), newSessionId))
            .first();

        if (existingSession) {
            return {
                id: existingSession._id,
                sessionId: existingSession.sessionId,
            };
        }

        // Format the initial message if provided
        const formattedMessage = args.initialMessage ? {
            type: "AGENT_MESSAGE",
            role: "ASSISTANT",
            messageText: args.initialMessage.content,
            timestamp: Date.now(),
        } : undefined;

        // If no existing session, create a new one
        const id = await ctx.db.insert("chatHistory", {
            userId,
            sessionId: newSessionId,
            messages: formattedMessage ? [formattedMessage] : [],
            events: formattedMessage ? [formattedMessage] : [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });

        return {
            id,
            sessionId: newSessionId,
        };
    },
});

// Update addMessageToSession to use events
export const addMessageToSession = mutation({
    args: {
        sessionId: v.string(),
        message: v.object({
            type: v.string(),
            role: v.union(v.literal("user"), v.literal("assistant")),
            messageText: v.string(),
            timestamp: v.number(),
            emotionFeatures: v.optional(v.any()),
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

        // Normalize the message and ensure all required fields are present
        const normalizedMessage = {
            ...args.message,
            role: args.message.role.toLowerCase() as "user" | "assistant",
            content: args.message.messageText, // Use messageText as content
            chatId: args.message.chatId || session.chatId || args.sessionId,
            chatGroupId: args.message.chatGroupId || session.chatGroupId || args.sessionId,
            metadata: {
                chat_id: args.message.chatId || session.chatId || args.sessionId,
                chat_group_id: args.message.chatGroupId || session.chatGroupId || args.sessionId,
                request_id: args.sessionId,
                timestamp: new Date(args.message.timestamp).toISOString()
            }
        };

        // Add the new message to both messages and events arrays
        const updatedMessages = [...(session.messages || []), normalizedMessage];
        const updatedEvents = [...(session.events || []), {
            ...normalizedMessage,
            messageText: normalizedMessage.content
        }];

        // Update the session with the new message
        await ctx.db.patch(session._id, {
            messages: updatedMessages,
            events: updatedEvents,
            updatedAt: Date.now()
        });

        return session._id;
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
        title: v.string()
    },
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
            throw new Error("Not authorized to rename this chat");
        }

        // Update the chat title
        await ctx.db.patch(args.id, {
            title: args.title
        });
        
        return true;
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
    humeChatId: v.string(), 
    humeGroupChatId: v.string(),
    metadata: v.optional(v.string())  // Add optional metadata field
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    // Parse metadata if provided
    let parsedMetadata;
    if (args.metadata) {
      try {
        parsedMetadata = JSON.parse(args.metadata);
      } catch (error) {
        console.error("Error parsing metadata:", error);
      }
    }

    // Create metadata object
    const metadata = parsedMetadata || {
      chat_id: args.humeChatId,
      chat_group_id: args.humeGroupChatId,
      request_id: args.humeChatId, // Use chatId as requestId if not provided
      timestamp: new Date().toISOString()
    };

    // Log the received Hume metadata
    console.log("Received Hume chat_metadata:", {
      sessionId: args.sessionId,
      humeChatId: args.humeChatId,
      humeGroupChatId: args.humeGroupChatId,
      metadata,
      userId,
      timestamp: new Date().toISOString()
    });

    // Find the chat session
    const chatSession = await ctx.db
      .query("chatHistory")
      .filter((q) => q.eq(q.field("userId"), userId))
      .filter((q) => q.eq(q.field("sessionId"), args.sessionId))
      .first();

    if (!chatSession) {
      console.error("Chat session not found for metadata update:", {
        sessionId: args.sessionId,
        userId,
        humeChatId: args.humeChatId,
        humeGroupChatId: args.humeGroupChatId,
        metadata
      });
      throw new Error("Chat session not found");
    }

    // Log the current state before update
    console.log("Current chat session state:", {
      sessionId: chatSession.sessionId,
      currentChatId: chatSession.chatId,
      currentGroupId: chatSession.chatGroupId,
      updatingTo: {
        chatId: args.humeChatId,
        chatGroupId: args.humeGroupChatId,
        metadata
      }
    });

    // Update the chat session with Hume's IDs and metadata
    await ctx.db.patch(chatSession._id, {
      chatId: args.humeChatId,
      chatGroupId: args.humeGroupChatId,
      metadata,
      updatedAt: Date.now(),
    });

    return { 
      success: true,
      sessionId: chatSession._id,
      chatId: args.humeChatId,
      chatGroupId: args.humeGroupChatId,
      metadata
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

// Function to save the complete conversation transcript and all events when a chat ends
export const saveConversationTranscript = mutation({
    args: {
        chatId: v.string(),
        humeChatId: v.string(),
        humeGroupChatId: v.string(),
        events: v.array(v.object({
            type: v.string(),
            role: v.string(),
            messageText: v.string(),
            timestamp: v.number(),
            emotionFeatures: v.optional(v.string()),
            chatId: v.string(),
            chatGroupId: v.string(),
        }))
    },
    handler: async (ctx, args) => {
        try {
            const identity = await ctx.auth.getUserIdentity();
            if (!identity) {
                throw new Error("Not authenticated");
            }

            const userId = identity.subject;

            // Find existing chat session
            const chatSession = await ctx.db
                .query("chatHistory")
                .filter((q) => q.eq(q.field("userId"), userId))
                .filter((q) => 
                    q.or(
                        q.eq(q.field("sessionId"), args.chatId),
                        q.eq(q.field("chatId"), args.chatId)
                    )
                )
                .first();

            if (!chatSession) {
                // If chat session doesn't exist, create a new one with Hume IDs
                const sessionId = await ctx.db.insert("chatHistory", {
                    userId,
                    sessionId: args.chatId,
                    chatId: args.humeChatId,
                    chatGroupId: args.humeGroupChatId,
                    events: args.events,
                    messages: args.events,
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                });

                return { 
                    success: true,
                    sessionId,
                    isNew: true
                };
            }

            // Update existing chat session with the new events and Hume IDs
            await ctx.db.patch(chatSession._id, {
                events: args.events,
                messages: args.events,
                chatId: args.humeChatId,
                chatGroupId: args.humeGroupChatId,
                updatedAt: Date.now()
            });

            return { 
                success: true, 
                sessionId: chatSession._id,
                isNew: false
            };
        } catch (error) {
            console.error("Error saving conversation transcript:", error);
            throw error;
        }
    }
});

// Base message fields for type checking
const baseMessageFields = {
  type: v.string(),
  role: v.string(),
  timestamp: v.number(),
  emotionFeatures: v.optional(v.any()),
  chatId: v.string(),
  chatGroupId: v.string(),
};

// Function to add an event to a session
export const addEventToSession = mutation({
  args: {
    sessionId: v.string(),
    event: v.object({
      ...baseMessageFields,
      messageText: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    // Find the chat session
    const session = await ctx.db
      .query("chatHistory")
      .filter((q) => q.eq(q.field("userId"), userId))
      .filter((q) => 
        q.or(
          q.eq(q.field("chatId"), args.sessionId),
          q.eq(q.field("sessionId"), args.sessionId)
        )
      )
      .first();

    // Convert the event to the new message format
    const newMessage = {
      type: args.event.type,
      role: args.event.role,
      content: args.event.messageText,
      messageText: args.event.messageText,
      timestamp: args.event.timestamp,
      emotionFeatures: args.event.emotionFeatures,
      chatId: args.event.chatId,
      chatGroupId: args.event.chatGroupId,
      metadata: {
        chat_id: args.event.chatId,
        chat_group_id: args.event.chatGroupId,
        request_id: args.event.chatId,
        timestamp: new Date(args.event.timestamp).toISOString()
      }
    };

    // Create a new event with both content and messageText
    const newEvent = {
      type: args.event.type,
      role: args.event.role,
      messageText: args.event.messageText,
      content: args.event.messageText,
      timestamp: args.event.timestamp,
      emotionFeatures: args.event.emotionFeatures,
      chatId: args.event.chatId,
      chatGroupId: args.event.chatGroupId,
    };

    if (!session) {
      // Create a new session if none exists
      const newSessionId = await ctx.db.insert("chatHistory", {
        userId,
        sessionId: args.sessionId,
        chatId: args.event.chatId,
        chatGroupId: args.event.chatGroupId,
        messages: [newMessage],
        events: [newEvent],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      return newSessionId;
    }

    // Add the new message and event
    const updatedMessages = [...(session.messages || []), newMessage];
    const updatedEvents = [...(session.events || []), newEvent];

    // Update the session with the new message and event
    await ctx.db.patch(session._id, {
      messages: updatedMessages,
      events: updatedEvents,
      chatId: args.event.chatId,
      chatGroupId: args.event.chatGroupId,
      updatedAt: Date.now(),
    });

    return session._id;
  },
}); 