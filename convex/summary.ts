import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { api } from "./_generated/api";
import { ActionCtx, MutationCtx, QueryCtx } from "./_generated/server";
import { ChatEvent } from "./chat"; // Import ChatEvent type from chat.ts

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp?: number;
  emotions?: Record<string, unknown>;
}

interface ChatSession {
  userId: string;
  messages: Message[];
  sessionId: string;
  createdAt: number;
  updatedAt: number;
  title?: string;
}

// Function to get the conversation summary for a user
export const getUserSummary = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    // Get the user's conversation summary
    const summary = await ctx.db
      .query("conversationSummaries")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    return summary;
  },
});

// Function to generate a summary for a conversation
export const generateSummary = action({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get the chat history for the session
    const session = await ctx.runQuery(api.chat.getChatSession, { sessionId: args.sessionId });

    if (!session) {
      throw new Error("Chat session not found");
    }

    const userId = session.userId;
    
    // Check if we have events - prefer using events over messages
    const events = session.events || [];
    const messages = session.messages || [];
    
    // If we have no events or messages, nothing to summarize
    if (events.length === 0 && messages.length === 0) {
      console.log("No messages or events to summarize");
      return null;
    }

    // Get the existing summary if available
    const existingSummary = await ctx.runQuery(api.summary.getSummaryByUserId, {
      userId: userId,
    });

    // Prepare the prompt for the AI model
    let prompt = "You are an AI therapist assistant. Summarize the following therapy conversation, focusing on key insights, issues discussed, and therapeutic progress. ";
    
    if (existingSummary) {
      prompt += "Incorporate this information with the previous summary. Previous summary: " + existingSummary.summary + "\n\n";
    } else {
      prompt += "This is the first conversation summary for this user.\n\n";
    }

    prompt += "Conversation to summarize:\n";

    // Format the conversation for the prompt - prefer using events if available
    let conversationText;
    
    if (events.length > 0) {
      // Filter events to only include user and assistant messages
      const relevantEvents = events.filter(event => 
        event.type === "USER_MESSAGE" || event.type === "AGENT_MESSAGE"
      );

      conversationText = relevantEvents.map((event) => {
        const role = event.role === "USER" ? "User" : "Therapist";
        return `${role}: ${event.messageText}`;
      }).join("\n");
    } else {
      // Fall back to using messages array if no events
      conversationText = messages
        .map((message) => `${message.role === "user" ? "User" : "Therapist"}: ${message.content}`)
        .join("\n");
    }

    prompt += conversationText;

    // Extract emotion data from user messages if available
    let emotionSummary = "";
    const userEvents = events.filter(event => event.type === "USER_MESSAGE" && event.emotionFeatures);
    
    if (userEvents.length > 0) {
      // Track emotion scores across all user messages
      const emotionScores: Record<string, number> = {};
      let totalUserMessages = 0;
      
      // Process each user message with emotion data
      userEvents.forEach(event => {
        if (event.emotionFeatures) {
          totalUserMessages++;
          try {
            const emotions = JSON.parse(event.emotionFeatures);
            // Aggregate emotion scores
            Object.entries(emotions).forEach(([emotion, score]) => {
              emotionScores[emotion] = (emotionScores[emotion] || 0) + (score as number);
            });
          } catch (e) {
            console.error("Error parsing emotion features:", e);
          }
        }
      });
      
      // Calculate averages and find top emotions
      if (totalUserMessages > 0) {
        const averageEmotions = Object.entries(emotionScores).map(([emotion, score]) => ({
          emotion,
          score: score / totalUserMessages
        }));
        
        // Sort by average score (descending) and pick the top 3
        averageEmotions.sort((a, b) => b.score - a.score);
        const top3 = averageEmotions.slice(0, 3);
        
        if (top3.length > 0) {
          emotionSummary = "\n\nDominant emotions detected in the user's voice:\n" + 
            top3.map(item => `- ${item.emotion}: ${(item.score * 100).toFixed(2)}%`).join("\n");
          
          prompt += emotionSummary;
        }
      }
    }

    try {
      // Use DeepSeek API for generating the summary
      const { default: axios } = await import("axios");
      
      // Use DeepSeek API
      const response = await axios.post(
        "https://api.deepseek.com/v1/chat/completions",
        {
          model: "deepseek-chat",
          messages: [
            {
              role: "system",
              content: "You are an AI assistant that summarizes therapy conversations. Create a concise yet comprehensive summary that captures key insights, issues discussed, and therapeutic progress. Focus on the most important aspects of the conversation that would be useful for future therapy sessions.",
            },
            {
              role: "user",
              content: prompt,
            }
          ],
          temperature: 0.7,
          max_tokens: 1000,
        },
        {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          },
        }
      );
      
      const summaryText = response.data.choices[0]?.message?.content || "No summary generated";
      
      // Save or update the summary in the database
      if (existingSummary) {
        await ctx.runMutation(api.summary.updateSummary, {
          summaryId: existingSummary._id,
          newSummary: summaryText,
          sessionId: args.sessionId,
        });
      } else {
        await ctx.runMutation(api.summary.createSummary, {
          userId,
          summary: summaryText,
          sessionId: args.sessionId,
        });
      }
      
      return summaryText;
    } catch (error) {
      console.error("Error generating summary with DeepSeek:", error);
      throw new Error("Failed to generate conversation summary");
    }
  },
});

// Internal function to get a summary by user ID
export const getSummaryByUserId = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("conversationSummaries")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
  },
});

// Internal function to create a new summary
export const createSummary = mutation({
  args: {
    userId: v.string(),
    summary: v.string(),
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("conversationSummaries", {
      userId: args.userId,
      summary: args.summary,
      lastUpdated: Date.now(),
      sessionIds: [args.sessionId],
    });
  },
});

// Internal function to update an existing summary
export const updateSummary = mutation({
  args: {
    summaryId: v.id("conversationSummaries"),
    newSummary: v.string(),
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const existingSummary = await ctx.db.get(args.summaryId);
    if (!existingSummary) {
      throw new Error("Summary not found");
    }

    // Add the new session ID if it's not already in the list
    const sessionIds = existingSummary.sessionIds || [];
    if (!sessionIds.includes(args.sessionId)) {
      sessionIds.push(args.sessionId);
    }

    await ctx.db.patch(args.summaryId, {
      summary: args.newSummary,
      lastUpdated: Date.now(),
      sessionIds: sessionIds,
    });

    return args.summaryId;
  },
});

// Function to trigger summary generation when a conversation ends
export const endConversationAndSummarize = mutation({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Trigger the summary generation action
    await ctx.scheduler.runAfter(0, api.summary.generateSummary, {
      sessionId: args.sessionId,
    });

    return {
      success: true,
      message: "Conversation summary generation initiated",
    };
  },
}); 