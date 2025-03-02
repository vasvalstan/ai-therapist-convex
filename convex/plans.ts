import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getPlans = query({
    handler: async (ctx) => {
        const plans = await ctx.db
            .query("plans").collect()

        return plans;
    },
});

export const getDetailedPlans = query({
    handler: async (ctx) => {
        const plans = await ctx.db
            .query("plans")
            .collect();
            
        // Format the plans for easy reading
        return plans.map(plan => ({
            key: plan.key,
            name: plan.name,
            description: plan.description,
            productId: plan.polarProductId,
            prices: {
                month: plan.prices.month?.usd,
                year: plan.prices.year?.usd
            }
        }));
    },
});

export const updateFreePlanForTesting = mutation({
    handler: async (ctx) => {
        // Find the free plan
        const freePlan = await ctx.db
            .query("plans")
            .withIndex("key", (q) => q.eq("key", "free"))
            .unique();
        
        if (!freePlan) {
            throw new Error("Free plan not found");
        }
        
        // Update the free plan to have a 1-minute limit
        await ctx.db.patch(freePlan._id, {
            maxSessionDurationMinutes: 1,
            totalMinutes: 2,
            features: [
                "2 sessions total",
                "1min session duration",
                "basic ai voice model",
                "limited session history"
            ]
        });
        
        // Also update existing free plan users
        const freeUsers = await ctx.db
            .query("users")
            .filter((q) => q.eq(q.field("currentPlanKey"), "free"))
            .collect();
            
        for (const user of freeUsers) {
            await ctx.db.patch(user._id, {
                minutesRemaining: 2,
                totalMinutesAllowed: 2
            });
        }
        
        return { success: true, message: "Free plan updated for testing" };
    }
});

export const initializePlans = mutation({
    handler: async (ctx) => {
        // First, check if plans already exist
        const existingPlans = await ctx.db.query("plans").collect();
        if (existingPlans.length > 0) {
            console.log("Plans already exist, skipping initialization");
            return;
        }

        // Insert the free plan
        await ctx.db.insert("plans", {
            key: "free",
            name: "Free Plan",
            description: "try us out with a limited free plan.",
            polarProductId: "free-plan-id", // This should be replaced with actual ID
            prices: {
                month: {
                    usd: {
                        amount: 0, // $0.00
                        polarId: "free-price-id" // This should be replaced with actual ID
                    }
                }
            },
            features: [
                "2 sessions total",
                "5min session duration",
                "basic ai voice model",
                "limited session history"
            ],
            maxSessionDurationMinutes: 5,
            totalMinutes: 10,
            maxSessions: 2
        });

        // Insert the basic plan
        await ctx.db.insert("plans", {
            key: "basic",
            name: "Basic Plan",
            description: "all the yapping you need, but on a student budget.",
            polarProductId: "95f4b508-c66a-40f6-85c8-33400fe7e8da",
            prices: {
                month: {
                    usd: {
                        amount: 1000, // $10.00
                        polarId: "cb200ef9-ff9a-4324-b3f2-51474d74c7c0"
                    }
                }
            },
            features: [
                "6 sessions/month",
                "10min session duration",
                "super empathetic ai voice model",
                "extended session history",
                "sneak peek at beta features"
            ],
            maxSessionDurationMinutes: 10,
            totalMinutes: 60
        });

        // Insert the premium plan
        await ctx.db.insert("plans", {
            key: "premium",
            name: "Premium Plan",
            description: "for when you've got a lot more on your mind.",
            polarProductId: "a810e909-62ee-4dd9-ba30-e36489d780f2",
            prices: {
                month: {
                    usd: {
                        amount: 2000, // $20.00
                        polarId: "2cc2089e-83cf-4601-9986-c96c259bda3c"
                    }
                }
            },
            features: [
                "all in basic, plus...",
                "20 sessions/month",
                "30min session duration",
                "direct support straight from the soul devs team"
            ],
            maxSessionDurationMinutes: 30,
            totalMinutes: 600
        });

        console.log("Plans initialized successfully");
    }
});

export const getAllPlans = query({
  handler: async (ctx) => {
    // Get all plans from the database
    const plans = await ctx.db.query("plans").collect();
    return plans;
  },
});

export const updatePlan = mutation({
  args: {
    key: v.string(),
    updates: v.object({
      maxSessionDurationMinutes: v.optional(v.number()),
      totalMinutes: v.optional(v.number()),
      features: v.optional(v.array(v.string())),
      description: v.optional(v.string()),
      name: v.optional(v.string()),
      maxSessions: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    // Find the plan by key
    const plan = await ctx.db
      .query("plans")
      .withIndex("key", (q) => q.eq("key", args.key))
      .unique();
    
    if (!plan) {
      throw new Error(`Plan with key '${args.key}' not found`);
    }
    
    // Update the plan with the provided updates
    await ctx.db.patch(plan._id, args.updates);
    
    // If updating the free plan's total minutes, also update existing free plan users
    if (args.key === "free" && args.updates.totalMinutes !== undefined) {
      const freeUsers = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("currentPlanKey"), "free"))
        .collect();
        
      for (const user of freeUsers) {
        await ctx.db.patch(user._id, {
          minutesRemaining: args.updates.totalMinutes,
          totalMinutesAllowed: args.updates.totalMinutes
        });
      }
    }
    
    return { 
      success: true, 
      message: `Plan '${args.key}' updated successfully`,
      updates: args.updates
    };
  }
});

export const updateUserPlanByEmail = mutation({
    args: { 
        email: v.string(),
        planKey: v.string()
    },
    handler: async (ctx, args) => {
        // Find the user by email
        const user = await ctx.db
            .query("users")
            .filter((q) => q.eq(q.field("email"), args.email))
            .unique();
        
        if (!user) {
            return { success: false, error: "User not found" };
        }
        
        // Get the plan details
        const plan = await ctx.db
            .query("plans")
            .withIndex("key", (q) => q.eq("key", args.planKey))
            .unique();
        
        if (!plan) {
            return { success: false, error: "Plan not found" };
        }
        
        // Calculate renewal date (1 month from now)
        const now = new Date();
        const renewalDate = new Date(now.setMonth(now.getMonth() + 1)).getTime();
        
        // Update the user with the new plan details
        await ctx.db.patch(user._id, {
            currentPlanKey: args.planKey,
            minutesRemaining: plan.totalMinutes || 0,
            totalMinutesAllowed: plan.totalMinutes || 0,
            planRenewalDate: renewalDate
        });
        
        return { 
            success: true, 
            message: "User plan updated successfully",
            plan: plan.key,
            minutes: plan.totalMinutes,
            maxSessionDuration: plan.maxSessionDurationMinutes
        };
    }
});

