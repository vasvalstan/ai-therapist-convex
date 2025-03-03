import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

// Submit feedback from a user
export const submitFeedback = mutation({
  args: {
    message: v.string(),
    sessionId: v.optional(v.string()),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get the authenticated user
    const identity = await ctx.auth.getUserIdentity();
    
    if (!identity) {
      // Allow anonymous feedback
      return await ctx.db.insert("feedback", {
        message: args.message,
        sessionId: args.sessionId,
        source: args.source || "trial_end",
        createdAt: Date.now(),
      });
    }
    
    // Get user info if authenticated
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .first();
    
    // Store feedback with user info if available
    return await ctx.db.insert("feedback", {
      userId: user?.userId,
      tokenIdentifier: identity.tokenIdentifier,
      sessionId: args.sessionId,
      message: args.message,
      source: args.source || "trial_end",
      createdAt: Date.now(),
    });
  },
});

// Get all feedback (admin only)
export const getAllFeedback = query({
  handler: async (ctx) => {
    // In a real app, you would add authorization checks here
    // to ensure only admins can access this data
    
    return await ctx.db.query("feedback")
      .order("desc")
      .collect();
  },
});

// Get feedback for a specific user
export const getUserFeedback = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // In a real app, you would add authorization checks here
    
    return await ctx.db.query("feedback")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

export const deleteFeedback = mutation({
    args: { id: v.id("feedback") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Not authenticated");
        }

        const feedback = await ctx.db.get(args.id);
        if (!feedback) {
            throw new Error("Feedback not found");
        }

        await ctx.db.delete(args.id);
        return true;
    },
}); 