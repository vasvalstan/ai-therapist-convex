import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

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

        return {
            id,
            sessionId: newSessionId,
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
            throw new Error("Not authenticated");
        }

        const userId = identity.subject;

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