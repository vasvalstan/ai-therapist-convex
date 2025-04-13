import { v } from "convex/values";
import { mutation, query, action, internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { api } from "./_generated/api";
import { ActionCtx, MutationCtx, QueryCtx } from "./_generated/server";
import { ChatEvent } from "./chat"; // Import ChatEvent type from chat.ts
import { Doc } from "./_generated/dataModel";
import { OpenAI } from "openai";

interface Message {
  role: "USER" | "ASSISTANT" | "SYSTEM";
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

// Define the schema for emotional progress
interface EmotionalProgress {
    mainThemes: string[];
    improvements: string[];
    challenges: string[];
    recommendations: string[];
}

interface TherapyProgress {
    userId: string;
    sessionIds: Id<"chatHistory">[];
    transcripts: {
        sessionId: Id<"chatHistory">;
        content: string;
        timestamp: number;
    }[];
    progressSummary: string;
    emotionalProgress: EmotionalProgress;
    lastUpdated: number;
}

interface ChatMessage {
    type: "USER_MESSAGE" | "AGENT_MESSAGE" | "SYSTEM_MESSAGE" | "CHAT_METADATA";
    role: "USER" | "ASSISTANT" | "SYSTEM";
    messageText: string;
    content?: string;
    timestamp: number;
    emotionFeatures?: string;
    chatId?: string;
    chatGroupId?: string;
    metadata?: {
        chat_id: string;
        chat_group_id: string;
        request_id: string;
        timestamp: string;
    };
}

// Add this type definition near the top of the file with other types
interface TherapyAnalysis {
  mainThemes: string[];
  improvements: string[];
  challenges: string[];
  recommendations: string[];
  progressSummary: string;
}

interface TopicAnalysis {
  topic: string;
  emotionalSignificance: string;
  frequency: "high" | "medium" | "low";
}

interface SessionAnalysis {
  mainTopics: TopicAnalysis[];
  emotionalState: {
    primaryEmotions: string[];
    triggers: string[];
    patterns: string[];
  };
  therapeuticProgress: {
    improvements: string[];
    insights: string[];
    copingStrategies: string[];
  };
  concernAreas: {
    challenges: string[];
    underlyingIssues: string[];
    riskFactors: string[];
  };
  recommendations: {
    actionableSteps: string[];
    futureTopics: string[];
    suggestedStrategies: string[];
  };
  sessionSummary: {
    mainFocus: string;
    breakthroughs: string[];
    therapeuticGoals: string[];
  };
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
  handler: async (ctx: ActionCtx, args) => {
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
        .map((message) => `${message.role === "USER" ? "User" : "Therapist"}: ${message.content}`)
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
      
      const deepseekApiKey = process.env.DEEPSEEK_API_KEY;
      if (!deepseekApiKey) {
        throw new Error("DEEPSEEK_API_KEY environment variable is not set");
      }
      
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
            "Authorization": `Bearer ${deepseekApiKey}`,
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

// Query to get a user's therapy progress
export const getTherapyProgress = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");
        const userId = identity.subject;

        console.log("🔍 Getting therapy progress for user:", userId);

        // Get existing progress record
        const progress = await ctx.db
            .query("therapyProgress")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .first();

        // Return empty progress object if no record exists
        if (!progress) {
            return {
                userId,
                sessionIds: [],
                transcripts: [],
                progressSummary: "No therapy sessions yet.",
                emotionalProgress: {
                    mainThemes: [],
                    improvements: [],
                    challenges: [],
                    recommendations: []
                },
                lastUpdated: Date.now()
            };
        }

        return progress;
    },
});

// Helper function to format transcript from messages
function formatTranscript(messages: any[]): string {
    return messages
        .map((msg) => {
            const displayRole = msg.role === "USER" ? "User" : 
                              msg.role === "ASSISTANT" ? "Assistant" : 
                              "System";
            const timestamp = msg.timestamp ? new Date(msg.timestamp).toISOString() : new Date().toISOString();
            const content = msg.content || msg.messageText || "";
            const emotions = msg.emotions ? `\nEmotions: ${JSON.stringify(msg.emotions)}` : "";
            
            return `[${timestamp}] ${displayRole}: ${content}${emotions}`;
        })
        .join("\n");
}

// Action to update progress with analysis results
export const updateProgressWithAnalysis = internalMutation({
  args: {
    progressId: v.id("therapyProgress"),
    analysis: v.object({
      mainThemes: v.array(v.string()),
      improvements: v.array(v.string()),
      challenges: v.array(v.string()),
      recommendations: v.array(v.string()),
      progressSummary: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    const progress = await ctx.db.get(args.progressId);
    if (!progress) {
      throw new Error("Progress record not found");
    }

    return await ctx.db.patch(args.progressId, {
      emotionalProgress: {
        mainThemes: args.analysis.mainThemes,
        improvements: args.analysis.improvements,
        challenges: args.analysis.challenges,
        recommendations: args.analysis.recommendations,
      },
      progressSummary: args.analysis.progressSummary,
      lastUpdated: Date.now(),
    });
  },
});

// Action to analyze session with DeepSeek API
export const analyzeSessionWithDeepSeek = action({
  args: { progressId: v.id("therapyProgress") },
  handler: async (ctx: ActionCtx, args) => {
    console.log("Starting analysis for progress record:", args.progressId);
    
    const progress = await ctx.runMutation(internal.summary.getProgressById, { 
      progressId: args.progressId 
    });
    
    if (!progress) {
      throw new Error("Progress record not found");
    }

    // Sort transcripts by timestamp to maintain chronological order
    const sortedTranscripts = [...progress.transcripts].sort((a, b) => a.timestamp - b.timestamp);
    const combinedTranscript = sortedTranscripts.map(t => t.content).join("\n\n");

    console.log("Analyzing", sortedTranscripts.length, "transcripts");

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      throw new Error("DEEPSEEK_API_KEY not set");
    }

    const client = new OpenAI({
      apiKey,
      baseURL: "https://api.deepseek.com/v1",
    });

    const analysisPrompt = `You are an experienced AI therapist analyzing a series of therapy sessions. 
As a therapeutic professional, analyze these sessions chronologically, focusing on the client's journey and progress.

Based on the following therapy transcripts, provide a comprehensive therapeutic analysis focusing on:

1. Main Discussion Topics (3-4 topics)
   - Identify the primary concerns and themes discussed across sessions
   - Note which topics triggered strong emotional responses
   - Track how these topics evolved over time
   - Highlight recurring patterns or themes

2. Client's Emotional Journey
   - Key emotional themes and their progression
   - How emotions evolved across different sessions
   - Notable emotional patterns or triggers
   - Changes in emotional responses over time

3. Therapeutic Progress
   - Concrete improvements observed across sessions
   - Growth in self-awareness and insight
   - Development of coping strategies
   - Changes in thought patterns or behaviors

4. Areas of Ongoing Work
   - Current challenges and struggles
   - Underlying themes needing attention
   - Potential risk factors or concerns
   - Resistance or barriers to progress

5. Therapeutic Recommendations
   - Specific, actionable next steps
   - Key areas to explore further
   - Suggested coping strategies or exercises
   - Long-term therapeutic goals

6. Progress Summary
   - Overall therapeutic journey
   - Key breakthroughs and insights
   - Current stage in therapy
   - Future focus areas

Return ONLY a JSON object with this exact structure:
{
  "mainTopics": [
    {
      "topic": "string",
      "emotionalSignificance": "string",
      "frequency": "high/medium/low",
      "progression": "string"
    }
  ],
  "emotionalState": {
    "primaryEmotions": ["string"],
    "triggers": ["string"],
    "patterns": ["string"],
    "evolution": "string"
  },
  "therapeuticProgress": {
    "improvements": ["string"],
    "insights": ["string"],
    "copingStrategies": ["string"],
    "progressionNotes": "string"
  },
  "concernAreas": {
    "challenges": ["string"],
    "underlyingIssues": ["string"],
    "riskFactors": ["string"],
    "priorityLevel": "high/medium/low"
  },
  "recommendations": {
    "actionableSteps": ["string"],
    "futureTopics": ["string"],
    "suggestedStrategies": ["string"],
    "longTermGoals": ["string"]
  },
  "sessionSummary": {
    "mainFocus": "string",
    "breakthroughs": ["string"],
    "therapeuticGoals": ["string"],
    "currentStage": "string"
  }
}

Transcripts (in chronological order):
${combinedTranscript}`;

    console.log("Sending request to DeepSeek API");
    const response = await client.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: "You are an experienced AI therapist with expertise in analyzing therapy sessions and providing insightful therapeutic recommendations. Focus on identifying patterns, emotional themes, and actionable insights that will be valuable for both the client and future therapy sessions."
        },
        {
          role: "user",
          content: analysisPrompt,
        },
      ],
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response content from DeepSeek API");
    }

    console.log("Received response from DeepSeek API:", content);

    // Clean up the response content to extract only the JSON part
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not find JSON object in response");
    }

    try {
      const analysis = JSON.parse(jsonMatch[0]);

      // Validate the analysis structure
      if (!analysis.mainTopics || !Array.isArray(analysis.mainTopics) ||
          !analysis.emotionalState || !analysis.emotionalState.primaryEmotions ||
          !analysis.therapeuticProgress || !analysis.therapeuticProgress.improvements ||
          !analysis.concernAreas || !analysis.concernAreas.challenges ||
          !analysis.recommendations || !analysis.recommendations.actionableSteps ||
          !analysis.sessionSummary || !analysis.sessionSummary.mainFocus) {
        throw new Error("Invalid analysis structure");
      }

      console.log("Analysis results:", {
        topicsCount: analysis.mainTopics.length,
        emotionsCount: analysis.emotionalState.primaryEmotions.length,
        recommendationsCount: analysis.recommendations.actionableSteps.length,
        summaryLength: analysis.sessionSummary.mainFocus.length,
      });

      // Create a more detailed progress summary
      const progressSummary = `Main focus: ${analysis.sessionSummary.mainFocus}\n\n` +
        `Key topics discussed: ${analysis.mainTopics.map((t: TopicAnalysis) => t.topic).join(", ")}\n\n` +
        `Emotional themes: ${analysis.emotionalState.primaryEmotions.join(", ")}\n\n` +
        `Progress: ${analysis.therapeuticProgress.improvements.join("; ")}\n\n` +
        `Recommendations for next session:\n${analysis.recommendations.actionableSteps.join("\n")}`;

      // Update the progress record with the analysis
      await ctx.runMutation(internal.summary.updateProgressWithAnalysis, {
        progressId: args.progressId,
        analysis: {
          mainThemes: analysis.mainTopics.map((t: TopicAnalysis) => `${t.topic} (${t.emotionalSignificance})`),
          improvements: analysis.therapeuticProgress.improvements,
          challenges: analysis.concernAreas.challenges,
          recommendations: analysis.recommendations.actionableSteps,
          progressSummary: progressSummary,
        },
      });

      console.log("Successfully updated progress record with analysis");
      return analysis;
    } catch (error: any) {
      console.error("Error parsing analysis:", error);
      throw new Error(`Failed to parse analysis: ${error?.message || 'Unknown error'}`);
    }
  },
});

// Internal mutation to get a progress record by ID
export const getProgressById = internalMutation({
  args: { progressId: v.id("therapyProgress") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.progressId);
  },
});

// Internal mutation to update therapy progress when a session ends
export const updateTherapyProgress = mutation({
    args: {
        sessionId: v.string(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");
        const userId = identity.subject;

        console.log("🔍 Looking for session with ID:", args.sessionId);

        // First try to find the session by chatId
        let session = await ctx.db
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
            console.error("❌ Session not found with ID:", args.sessionId);
            throw new Error(`Session not found with ID: ${args.sessionId}`);
        }

        console.log("✅ Found session:", {
            id: session._id,
            chatId: session.chatId,
            sessionId: session.sessionId,
            messageCount: session.messages?.length || 0
        });

        const convexSessionId = session._id;

        // 2. Get or create therapy progress record
        let progress = await ctx.db
            .query("therapyProgress")
            .filter((q) => q.eq(q.field("userId"), userId))
            .first();

        console.log("🔍 Existing progress record:", progress ? {
            id: progress._id,
            sessionCount: progress.sessionIds.length,
            transcriptCount: progress.transcripts.length
        } : "None found");

        // Generate transcript from session messages
        const transcript = (session.messages as Doc<"chatHistory">["messages"])
            .map((msg) => {
                const displayRole = msg.role === "USER" ? "User" : 
                                  msg.role === "ASSISTANT" ? "Assistant" : 
                                  "System";
                return `[${new Date(msg.timestamp).toISOString()}] ${displayRole}: ${msg.content || msg.messageText}`;
            })
            .join("\n");

        console.log("📝 Generated transcript with", transcript.split('\n').length, "lines");

        // First, store the basic record without analysis
        if (!progress) {
            console.log("➕ Creating new therapy progress record");
            const progressId = await ctx.db.insert("therapyProgress", {
                userId,
                sessionIds: [convexSessionId],
                transcripts: [{
                    sessionId: convexSessionId,
                    content: transcript,
                    timestamp: Date.now()
                }],
                progressSummary: "Session completed. Analysis in progress...",
                emotionalProgress: {
                    mainThemes: [],
                    improvements: [],
                    challenges: [],
                    recommendations: []
                },
                lastUpdated: Date.now()
            });
            progress = await ctx.db.get(progressId);
            console.log("✅ Created new progress record:", progressId);
        } else {
            console.log("📝 Updating existing progress record");
            const updatedTranscripts = [
                ...progress.transcripts,
                {
                    sessionId: convexSessionId,
                    content: transcript,
                    timestamp: Date.now()
                }
            ];

            await ctx.db.patch(progress._id, {
                sessionIds: [...progress.sessionIds, convexSessionId],
                transcripts: updatedTranscripts,
                lastUpdated: Date.now()
            });
            console.log("✅ Updated progress record with new transcript");
        }

        // Schedule the analysis to run after
        if (progress) {
            console.log("🔄 Scheduling DeepSeek analysis for progress:", progress._id);
            await ctx.scheduler.runAfter(0, api.summary.analyzeSessionWithDeepSeek, {
                progressId: progress._id,
            });
            console.log("✅ Analysis scheduled successfully");
        }

        return { success: true };
    }
}); 