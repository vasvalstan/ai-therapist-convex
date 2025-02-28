import { registry } from "@/utils/registry";
import { groq } from "@ai-sdk/groq";
import {
  extractReasoningMiddleware,
  streamText,
  experimental_wrapLanguageModel as wrapLanguageModel,
} from "ai";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const {
    messages,
    model,
    temperature,
    maxTokens,
    topP,
    frequencyPenalty,
    presencePenalty,
    systemPrompt,
  } = await req.json();

  console.log("model", model);

  const defaultSystemPrompt = `
    You are an AI assistant that helps users with programming and technical questions.
    
    Principles:
    1. Helpfulness: Provide useful, relevant information and solutions
    2. Accuracy: Ensure technical accuracy in all responses
    3. Clear Communication: Communicate clearly and effectively, using appropriate technical depth
    4. Safety & Ethics: Maintain safety and ethical behavior, avoiding harmful or malicious content

    Guidelines:
    - Be direct and concise in responses
    - Show code examples when relevant
    - Explain complex topics in digestible parts
    - Maintain a helpful and professional tone
    - Acknowledge limitations and uncertainties
    - Prioritize user safety and ethical considerations
  `;

  const enhancedModel = wrapLanguageModel({
    model: groq("deepseek-r1-distill-llama-70b"),
    middleware: extractReasoningMiddleware({ tagName: "think" }),
  });

  const result = streamText({
    model:
      model === "deepseek:deepseek-reasoner"
        ? enhancedModel
        : registry.languageModel(model),
    messages,
    temperature: temperature || 0.7,
    maxTokens: maxTokens || 1000,
    topP: topP || 0.9,
    frequencyPenalty: frequencyPenalty || 0.0,
    presencePenalty: presencePenalty || 0.0,
    system: systemPrompt || defaultSystemPrompt,
    // tools,
    maxSteps: 5,
    onStepFinish({
      text,
      finishReason,
      usage,
      stepType,
      toolResults,
    }) {
      // your own logic, e.g. for saving the chat history or recording usage
      console.log("stepType", stepType);
      console.log("text", text);
      console.log("finishReason", finishReason);
      console.log("usage", usage);

      if (finishReason === "tool-calls") {
        const toolInvocations = toolResults?.[0];
        // saveToolResult(userId!, toolInvocations);
        console.log("toolInvocations", toolInvocations);
      }
    },
    onFinish: ({ text, finishReason }) => {
      console.log("text", text);
      console.log("finishReason", finishReason);
      // insertMessage(userId!, "assistant", text);
    },
  });

  return result.toDataStreamResponse({
    sendReasoning: true,
  });
}
