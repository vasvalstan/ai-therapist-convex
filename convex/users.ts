import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

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

export const getAllUsers = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db
            .query("users")
            .collect();
    },
});

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

export const getUserById = query({
    args: { userId: v.string() },
    handler: async (ctx, args) => {
        // First try to find by _id (document ID)
        try {
            // Check if the userId is a valid document ID
            if (args.userId.startsWith("users:")) {
                const user = await ctx.db.get(args.userId as Id<"users">);
                if (user) return user;
            }
        } catch (e) {
            // If not a valid document ID, continue to search by userId field
        }
        
        // If not found or not a valid document ID, try to find by userId field
        return await ctx.db
            .query("users")
            .filter((q) => q.eq(q.field("userId"), args.userId))
            .unique();
    },
});

export const getUserByEmail = query({
    args: { email: v.string() },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query("users")
            .filter((q) => q.eq(q.field("email"), args.email))
            .unique();
            
        return user;
    },
});

export const updateUserMinutes = mutation({
    args: { 
        userId: v.string(),
        minutesRemaining: v.number(),
        totalMinutesAllowed: v.optional(v.number())
    },
    handler: async (ctx, args) => {
        // First try to find by _id (document ID)
        let user;
        try {
            // Check if the userId is a valid document ID
            if (args.userId.startsWith("users:")) {
                user = await ctx.db.get(args.userId as Id<"users">);
            }
        } catch (e) {
            // If not a valid document ID, continue to search by userId field
        }
        
        // If not found or not a valid document ID, try to find by userId field
        if (!user) {
            user = await ctx.db
                .query("users")
                .filter((q) => q.eq(q.field("userId"), args.userId))
                .unique();
        }
        
        if (!user) {
            throw new Error(`User with ID ${args.userId} not found`);
        }
        
        // Update the user with new minutes
        const updateData: any = {
            minutesRemaining: args.minutesRemaining
        };
        
        // Only update totalMinutesAllowed if provided
        if (args.totalMinutesAllowed !== undefined) {
            updateData.totalMinutesAllowed = args.totalMinutesAllowed;
        }
        
        await ctx.db.patch(user._id, updateData);
        
        // Return the updated user
        return {
            ...user,
            ...updateData
        };
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

        // Get the free plan details
        const freePlan = await ctx.db
            .query("plans")
            .withIndex("key", (q) => q.eq("key", "free"))
            .unique();

        // Default values if plan not found
        const totalMinutes = freePlan?.totalMinutes || 10;
        
        // If it's a new identity, create a new User with the free plan
        const userId = await ctx.db.insert("users", {
            name: identity.name!,
            email: identity.email!,
            userId: identity.subject,
            tokenIdentifier: identity.subject,
            createdAt: new Date().toISOString(),
            currentPlanKey: "free", // Assign free plan by default
            minutesRemaining: totalMinutes, // Set initial minutes based on free plan
            totalMinutesAllowed: totalMinutes
        });
        
        return { success: true, userId };
    },
});

export const resetAllUserMinutes = mutation({
  handler: async (ctx) => {
    // Get all users
    const users = await ctx.db.query("users").collect();
    const updatedUsers = [];
    
    for (const user of users) {
      // Get the user's plan
      const planKey = user.currentPlanKey || "free";
      const plan = await ctx.db
        .query("plans")
        .withIndex("key", (q) => q.eq("key", planKey))
        .unique();
      
      if (!plan) {
        console.error(`Plan ${planKey} not found for user ${user._id}`);
        continue;
      }
      
      // Reset minutes based on plan's totalMinutes
      const totalMinutes = plan.totalMinutes || 0;
      
      // Update the user
      await ctx.db.patch(user._id, {
        minutesRemaining: totalMinutes,
        totalMinutesAllowed: totalMinutes
      });
      
      updatedUsers.push({
        id: user._id,
        name: user.name,
        email: user.email,
        plan: planKey,
        minutesReset: totalMinutes
      });
    }
    
    return {
      success: true,
      message: `Reset minutes for ${updatedUsers.length} users`,
      updatedUsers
    };
  }
});

export const setAllUsersTo5Minutes = mutation({
  handler: async (ctx) => {
    // Get all users
    const users = await ctx.db.query("users").collect();
    
    // Update each user to have exactly 5 minutes
    const updatedUsers = [];
    
    for (const user of users) {
      await ctx.db.patch(user._id, {
        minutesRemaining: 5,
      });
      
      updatedUsers.push({
        id: user._id,
        name: user.name,
        email: user.email,
        plan: user.currentPlanKey || "free",
        minutesSet: 5
      });
    }
    
    return {
      success: true,
      message: `Set minutes to 5 for ${users.length} users`,
      updatedUsers
    };
  }
});

export const setFreePlanUsersTo10Minutes = mutation({
  handler: async (ctx) => {
    // Get all users
    const users = await ctx.db.query("users").collect();
    
    // Update only free plan users to have exactly 10 minutes
    const updatedUsers = [];
    
    for (const user of users) {
      const planKey = user.currentPlanKey || "free";
      
      // Only update users on the free plan
      if (planKey === "free") {
        await ctx.db.patch(user._id, {
          minutesRemaining: 10,
          totalMinutesAllowed: 10
        });
        
        updatedUsers.push({
          id: user._id,
          name: user.name,
          email: user.email,
          plan: "free",
          minutesSet: 10
        });
      }
    }
    
    return {
      success: true,
      message: `Set minutes to 10 for ${updatedUsers.length} free plan users`,
      updatedUsers
    };
  }
});

export const deleteUser = mutation({
    args: { id: v.id("users") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Not authenticated");
        }

        const user = await ctx.db.get(args.id);
        if (!user) {
            throw new Error("User not found");
        }

        await ctx.db.delete(args.id);
        return true;
    },
});
