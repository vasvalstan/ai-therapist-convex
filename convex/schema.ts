import { defineSchema, defineTable } from "convex/server"
import { Infer, v } from "convex/values"

export const INTERVALS = {
    MONTH: "month",
    YEAR: "year",
} as const;

export const intervalValidator = v.union(
    v.literal(INTERVALS.MONTH),
    v.literal(INTERVALS.YEAR),
);

export type Interval = Infer<typeof intervalValidator>;

// Define a price object structure that matches your data
const priceValidator = v.object({
    amount: v.number(),
    polarId: v.string(),
});

// Define a prices object structure for a specific interval
const intervalPricesValidator = v.object({
    usd: priceValidator,
});


export default defineSchema({
    users: defineTable({
        createdAt: v.string(),
        email: v.string(),
        name: v.optional(v.string()),
        image: v.optional(v.string()),
        userId: v.string(),
        subscription: v.optional(v.string()),
        credits: v.optional(v.string()),
        tokenIdentifier: v.string(),
        currentPlanKey: v.optional(v.string()),
        minutesRemaining: v.optional(v.number()),
        totalMinutesAllowed: v.optional(v.number()),
        planRenewalDate: v.optional(v.number()),
    }).index("by_token", ["tokenIdentifier"]),
    plans: defineTable({
        key: v.string(),
        name: v.string(),
        description: v.string(),
        polarProductId: v.string(),
        prices: v.object({
            month: v.optional(intervalPricesValidator),
            year: v.optional(intervalPricesValidator),
        }),
        features: v.optional(v.array(v.string())),
        maxSessionDurationMinutes: v.optional(v.number()),
        totalMinutes: v.optional(v.number()),
        maxSessions: v.optional(v.number()),
    })
        .index("key", ["key"])
        .index("polarProductId", ["polarProductId"]),
    subscriptions: defineTable({
        userId: v.optional(v.string()),
        polarId: v.optional(v.string()),
        polarPriceId: v.optional(v.string()),
        currency: v.optional(v.string()),
        interval: v.optional(v.string()),
        status: v.optional(v.string()),
        currentPeriodStart: v.optional(v.number()),
        currentPeriodEnd: v.optional(v.number()),
        cancelAtPeriodEnd: v.optional(v.boolean()),
        amount: v.optional(v.number()),
        startedAt: v.optional(v.number()),
        endsAt: v.optional(v.number()),
        endedAt: v.optional(v.number()),
        canceledAt: v.optional(v.number()),
        customerCancellationReason: v.optional(v.string()),
        customerCancellationComment: v.optional(v.string()),
        metadata: v.optional(v.any()),
        customFieldData: v.optional(v.any()),
        customerId: v.optional(v.string()),
    })
        .index("userId", ["userId"])
        .index("polarId", ["polarId"]),
    webhookEvents: defineTable({
        type: v.string(),
        polarEventId: v.string(),
        createdAt: v.string(),
        modifiedAt: v.string(),
        data: v.any(),
    })
        .index("type", ["type"])
        .index("polarEventId", ["polarEventId"]),
    chatHistory: defineTable({
        userId: v.string(),
        sessionId: v.string(),
        messages: v.array(v.object({
            role: v.union(v.literal("user"), v.literal("assistant")),
            content: v.string(),
            timestamp: v.number(),
            emotions: v.optional(v.any()),
        })),
        createdAt: v.number(),
        updatedAt: v.number(),
        title: v.optional(v.string()),
    })
        .index("by_user", ["userId"])
        .index("by_user_and_time", ["userId", "createdAt"]),
    feedback: defineTable({
        userId: v.optional(v.string()),
        tokenIdentifier: v.optional(v.string()),
        sessionId: v.optional(v.string()),
        message: v.string(),
        createdAt: v.number(),
        source: v.optional(v.string()),
    })
        .index("by_user", ["userId"])
        .index("by_token", ["tokenIdentifier"])
        .index("by_session", ["sessionId"]),
})