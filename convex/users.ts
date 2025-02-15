import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getUser = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (identity === null) {
            return ("Not authenticated");
        }
        return identity
    }
})

export const getUserByToken = query({
    args: { tokenIdentifier: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("users")
            .withIndex("by_token", (q) =>
                q.eq("tokenIdentifier", args.tokenIdentifier)
            )
            .unique();
    },
});

export const store = mutation({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            return { error: "Authentication required" };
        }

        // Check if we've already stored this identity before
        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) =>
                q.eq("tokenIdentifier", identity.subject)
            )
            .unique();

        if (user !== null) {
            // If we've seen this identity before but the name has changed, patch the value
            if (user.name !== identity.name) {
                await ctx.db.patch(user._id, { name: identity.name, email: identity.email });
            }
            return { success: true, userId: user._id };
        }

        // If it's a new identity, create a new User
        const userId = await ctx.db.insert("users", {
            name: identity.name!,
            email: identity.email!,
            userId: identity.subject,
            tokenIdentifier: identity.subject,
            createdAt: new Date().toISOString(),
        });
        return { success: true, userId };
    },
});
