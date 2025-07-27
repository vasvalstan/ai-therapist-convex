import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

export const INTERVALS = {
  MONTH: "month",
  YEAR: "year",
} as const;

export const intervalValidator = v.union(
  v.literal(INTERVALS.MONTH),
  v.literal(INTERVALS.YEAR)
);

export type Interval = Infer<typeof intervalValidator>;

// Define a price object structure that matches your data
const priceValidator = v.object({
  amount: v.number(),
  polarId: v.optional(v.string()), // Make optional since Polar doesn't use separate price IDs
});

// Define a prices object structure for a specific interval
const intervalPricesValidator = v.object({
  usd: priceValidator,
});

// Define base message fields
const baseMessageFields = {
  type: v.string(),
  role: v.string(),
  timestamp: v.number(),
  emotionFeatures: v.optional(v.any()),
  chatId: v.optional(v.string()),
  chatGroupId: v.optional(v.string()),
};

// Define message validator
const messageValidator = v.object({
  ...baseMessageFields,
  content: v.optional(v.string()),
  messageText: v.optional(v.string()),
  metadata: v.optional(
    v.object({
      chat_id: v.string(),
      chat_group_id: v.string(),
      request_id: v.string(),
      timestamp: v.string(),
    })
  ),
});

// Define event validator
const eventValidator = v.object({
  ...baseMessageFields,
  messageText: v.optional(v.string()),
  content: v.optional(v.string()),
  metadata: v.optional(
    v.object({
      chat_id: v.string(),
      chat_group_id: v.string(),
      request_id: v.string(),
      timestamp: v.string(),
    })
  ),
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
    hasUsedTrial: v.optional(v.boolean()),
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
  messages: defineTable({
    sessionId: v.id("sessions"),
    ...baseMessageFields,
    content: v.string(),
    messageText: v.optional(v.string()),
    metadata: v.optional(
      v.object({
        chat_id: v.string(),
        chat_group_id: v.string(),
        request_id: v.string(),
        timestamp: v.string(),
      })
    ),
  }).index("by_session", ["sessionId"]),
  chatHistory: defineTable({
    userId: v.string(),
    sessionId: v.string(),
    chatId: v.optional(v.string()),
    chatGroupId: v.optional(v.string()),
    title: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
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
  })
    .index("by_chat_id", ["chatId"])
    .index("by_session", ["sessionId"])
    .index("by_user", ["userId"]),
  conversationSummaries: defineTable({
    userId: v.string(),
    summary: v.string(),
    lastUpdated: v.number(),
    sessionIds: v.array(v.string()),
  }).index("by_user", ["userId"]),
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
  therapyProgress: defineTable({
    userId: v.string(),
    sessionIds: v.array(v.id("chatHistory")),
    transcripts: v.array(
      v.object({
        sessionId: v.id("chatHistory"),
        content: v.string(),
        timestamp: v.number(),
      })
    ),
    progressSummary: v.string(),
    emotionalProgress: v.object({
      mainThemes: v.array(v.string()),
      improvements: v.array(v.string()),
      challenges: v.array(v.string()),
      recommendations: v.array(v.string()),
    }),
    lastUpdated: v.number(),
  }).index("by_user", ["userId"]),
});
