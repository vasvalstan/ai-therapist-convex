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

// Add Message type definition
interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: number;
  emotions?: Record<string, unknown>;
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
    type: message.role.toUpperCase() === "USER" ? "USER_MESSAGE" : 
          message.role.toUpperCase() === "ASSISTANT" ? "AGENT_MESSAGE" : "SYSTEM_MESSAGE",
    role: message.role.toUpperCase() as "USER" | "ASSISTANT" | "SYSTEM",
    messageText: message.content,
    timestamp: message.timestamp || Date.now(),
    emotionFeatures: message.emotions ? JSON.stringify(message.emotions) : undefined,
    chatId,
    chatGroupId
  };
}

// Update createChatSession to handle chat groups
export const createChatSession = mutation({
    args: {
        sessionId: v.optional(v.string()),
        initialMessage: v.optional(v.object({
            role: v.union(v.literal("user"), v.literal("assistant")),
            content: v.string(),
            emotions: v.optional(v.any()),
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
            .filter((q) => 
                q.or(
                    q.eq(q.field("sessionId"), newSessionId),
                    q.eq(q.field("chatId"), newSessionId)
                )
            )
            .first();

        if (existingSession) {
            return {
                id: existingSession._id,
                sessionId: existingSession.sessionId || existingSession.chatId,
                chatId: existingSession.sessionId || existingSession.chatId,
            };
        }

        // If no existing session, create a new one
        const id = await ctx.db.insert("chatHistory", {
            userId,
            sessionId: newSessionId,
            chatId: newSessionId, // Set both fields to the same value
            messages: args.initialMessage ? [{
                ...args.initialMessage,
                timestamp: Date.now(),
            }] : [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });

        return {
            id,
            sessionId: newSessionId,
            chatId: newSessionId,
        };
    },
});

// Update addMessageToSession to use events
export const addMessageToSession = mutation({
    args: {
        sessionId: v.string(),
        chatId: v.optional(v.string()), // Add optional chatId for backward compatibility
        message: v.object({
            role: v.union(v.literal("user"), v.literal("assistant")),
            content: v.string(),
            emotions: v.optional(v.any()),
        }),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Not authenticated");
        }

        const userId = identity.subject;
        
        // Use either chatId or sessionId (for backward compatibility)
        const sessionIdentifier = args.chatId || args.sessionId;

        // Find the chat session
        const session = await ctx.db
            .query("chatHistory")
            .filter((q) => q.eq(q.field("userId"), userId))
            .filter((q) => q.eq(q.field("sessionId"), sessionIdentifier))
            .first();

        if (!session) {
            throw new Error("Chat session not found");
        }

        // Add the new message
        const updatedMessages = [...(session.messages || []), {
            ...args.message,
            timestamp: Date.now(),
        }];

        // Update the session with the new message
        await ctx.db.patch(session._id, {
            messages: updatedMessages,
            updatedAt: Date.now(),
        });

        return session._id;
    },
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
    chatId: v.string(), 
    humeChatId: v.string(), 
    humeGroupChatId: v.string() 
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    // Find the chat session - use sessionId instead of chatId to match the database schema
    const chatSession = await ctx.db
      .query("chatHistory")
      .filter((q) => q.eq(q.field("userId"), userId))
      .filter((q) => q.eq(q.field("sessionId"), args.chatId))
      .first();

    if (!chatSession) {
      throw new Error("Chat session not found");
    }

    // Update the chat session with Hume's IDs
    // Store these as custom fields since they're not in the schema
    const metadata = {
      humeChatId: args.humeChatId,
      humeGroupChatId: args.humeGroupChatId
    };
    
    await ctx.db.patch(chatSession._id, {
      // Store metadata in the title field temporarily
      title: JSON.stringify(metadata),
      updatedAt: Date.now(),
    });

    return { success: true };
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
          q.or(
            q.eq(q.field("chatId"), args.chatId),
            q.eq(q.field("sessionId"), args.chatId)
          ),
          q.eq(q.field("userId"), identity.subject)
        )
      )
      .first();

    if (!chat) {
      // Instead of throwing error, return null to handle gracefully in UI
      return null;
    }

    return {
      chatId: chat.chatId || chat.sessionId, // Use sessionId as fallback
      messages: chat.messages || [],
      title: chat.title,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
      events: chat.events || []
    };
  },
});

// Function to save the complete conversation transcript and all events when a chat ends
export const saveConversationTranscript = mutation({
  args: {
    chatId: v.string(),
    humeChatId: v.optional(v.string()),
    humeGroupChatId: v.optional(v.string()),
    events: v.array(
      v.object({
        type: v.string(),
        role: v.string(),
        messageText: v.string(),
        timestamp: v.number(),
        emotionFeatures: v.optional(v.string()),
        chatId: v.string(),
        chatGroupId: v.string(),
      })
    ),
    sessionDurationMinutes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      const identity = await ctx.auth.getUserIdentity();
      let userId;
      
      // If authenticated, use the user's ID, otherwise use a test ID
      if (identity) {
        userId = identity.subject;
      } else {
        // For testing - use a default user ID
        console.log("Using test user ID for transcript saving");
        userId = "test_user_id";
      }

      // Find the chat session - use both chatId and sessionId fields for backward compatibility
      const chatSession = await ctx.db
        .query("chatHistory")
        .filter((q) => q.eq(q.field("userId"), userId))
        .filter((q) => 
          q.or(
            q.eq(q.field("chatId"), args.chatId),
            q.eq(q.field("sessionId"), args.chatId)
          )
        )
        .first();

      if (!chatSession) {
        // If chat session doesn't exist, create a new one
        const sessionId = await ctx.db.insert("chatHistory", {
          userId,
          sessionId: args.chatId,
          chatId: args.chatId,
          chatGroupId: args.humeGroupChatId || args.chatId,
          events: args.events,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          // Convert events to messages format for backward compatibility
          messages: args.events
            .filter(event => ['USER_MESSAGE', 'AGENT_MESSAGE'].includes(event.type))
            .map(event => ({
              role: event.role === 'USER' ? 'user' : 'assistant',
              content: event.messageText,
              timestamp: event.timestamp,
              emotions: event.emotionFeatures ? JSON.parse(event.emotionFeatures) : undefined
            })) as { role: "user" | "assistant"; content: string; timestamp: number; emotions?: any }[]
        });

        // Skip scheduling other functions for now
        return { 
          success: true,
          sessionId,
          isNew: true
        };
      }

      // Update existing chat session with the new events and Hume IDs
      await ctx.db.patch(chatSession._id, {
        events: args.events,
        chatId: args.humeChatId || chatSession.chatId || chatSession.sessionId,
        chatGroupId: args.humeGroupChatId || chatSession.chatGroupId || chatSession.chatId || chatSession.sessionId,
        updatedAt: Date.now(),
        // Update messages array for backward compatibility
        messages: args.events
          .filter(event => ['USER_MESSAGE', 'AGENT_MESSAGE'].includes(event.type))
          .map(event => ({
            role: event.role === 'USER' ? 'user' : 'assistant',
            content: event.messageText,
            timestamp: event.timestamp,
            emotions: event.emotionFeatures ? JSON.parse(event.emotionFeatures) : undefined
          })) as { role: "user" | "assistant"; content: string; timestamp: number; emotions?: any }[]
      });

      // Skip scheduling other functions for now
      return { 
        success: true, 
        sessionId: chatSession._id,
        isNew: false
      };
    } catch (error) {
      console.error("Error in saveConversationTranscript:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  },
});

// Function to add an event to a session
export const addEventToSession = mutation({
  args: {
    sessionId: v.string(),
    event: v.object({
      type: v.string(),
      role: v.string(),
      messageText: v.string(),
      timestamp: v.number(),
      emotionFeatures: v.optional(v.string()),
      chatId: v.string(),
      chatGroupId: v.string(),
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

    if (!session) {
      throw new Error("Chat session not found");
    }

    // Add the new event
    const updatedEvents = [...(session.events || []), args.event];

    // If this is a user or assistant message, also update the messages array for backward compatibility
    const updatedMessages = [...(session.messages || [])];
    
    if (['USER_MESSAGE', 'AGENT_MESSAGE'].includes(args.event.type)) {
      updatedMessages.push({
        role: args.event.role === 'USER' ? 'user' : 'assistant',
        content: args.event.messageText,
        timestamp: args.event.timestamp,
        emotions: args.event.emotionFeatures ? JSON.parse(args.event.emotionFeatures) : undefined
      });
    }

    // Update the session with the new event and message (if applicable)
    await ctx.db.patch(session._id, {
      events: updatedEvents,
      messages: updatedMessages,
      updatedAt: Date.now(),
    });

    return session._id;
  },
}); 