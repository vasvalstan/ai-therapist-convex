import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { QueryCtx } from "./_generated/server";

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
            throw new Error("Authentication required");
        }

        const userId = identity.subject;
        
        // Check if user has access to chat
        const accessCheck = await checkUserChatAccess(ctx, userId);
        if (!accessCheck.hasAccess) {
            console.log(`Access denied for user ${userId}: ${accessCheck.reason}`);
            throw new Error(accessCheck.reason);
        }
        
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

        // If no existing session, create a new one
        const id = await ctx.db.insert("chatHistory", {
            userId,
            sessionId: newSessionId,
            messages: args.initialMessage ? [{
                ...args.initialMessage,
                timestamp: Date.now(),
            }] : [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });

        console.log(`New chat session created for user ${userId}: ${newSessionId}`);
        
        return {
            id,
            sessionId: newSessionId,
            minutesRemaining: accessCheck.minutesRemaining,
            maxSessionDurationMinutes: accessCheck.maxSessionDurationMinutes
        };
    },
});

export const addMessageToSession = mutation({
    args: {
        sessionId: v.string(),
        message: v.object({
            role: v.union(v.literal("user"), v.literal("assistant")),
            content: v.string(),
            emotions: v.optional(v.any()),
        }),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Authentication required");
        }

        const userId = identity.subject;
        
        // Check if user has access to chat
        const accessCheck = await checkUserChatAccess(ctx, userId);
        if (!accessCheck.hasAccess) {
            console.log(`Message denied for user ${userId}: ${accessCheck.reason}`);
            throw new Error(accessCheck.reason);
        }

        // Find the chat session
        const session = await ctx.db
            .query("chatHistory")
            .filter((q) => q.eq(q.field("userId"), userId))
            .filter((q) => q.eq(q.field("sessionId"), args.sessionId))
            .first();

        if (!session) {
            throw new Error("Chat session not found");
        }

        // Add the new message
        const updatedMessages = [...session.messages, {
            ...args.message,
            timestamp: Date.now(),
        }];

        // Update the session with the new message
        await ctx.db.patch(session._id, {
            messages: updatedMessages,
            updatedAt: Date.now(),
        });

        console.log(`Message added to session ${args.sessionId} for user ${userId}`);
        
        return {
            sessionId: session._id,
            minutesRemaining: accessCheck.minutesRemaining,
            maxSessionDurationMinutes: accessCheck.maxSessionDurationMinutes
        };
    },
});

export const getChatSessions = query({
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Not authenticated");
        }

        const userId = identity.subject;

        return await ctx.db
            .query("chatHistory")
            .filter((q) => q.eq(q.field("userId"), userId))
            .order("desc")
            .collect();
    },
});

export const getChatSession = query({
    args: { sessionId: v.string() },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Not authenticated");
        }

        const userId = identity.subject;

        return await ctx.db
            .query("chatHistory")
            .filter((q) => q.eq(q.field("userId"), userId))
            .filter((q) => q.eq(q.field("sessionId"), args.sessionId))
            .first();
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
        const chat = await ctx.db.get(args.id);

        if (!chat) {
            throw new Error("Chat not found");
        }

        if (chat.userId !== userId) {
            throw new Error("Not authorized");
        }

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
        const chat = await ctx.db.get(args.id);

        if (!chat) {
            throw new Error("Chat not found");
        }

        if (chat.userId !== userId) {
            throw new Error("Not authorized");
        }

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