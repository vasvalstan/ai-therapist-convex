import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { v } from "convex/values";

// Create a client for the development deployment
const client = new ConvexHttpClient("http://localhost:3000/api/convex");

async function clearDatabase() {
  try {
    // Delete all chat history
    const chatHistory = await client.query(api.chat.getAllChatHistory);
    for (const chat of chatHistory) {
      await client.mutation(api.chat.deleteChat, { id: chat._id });
    }
    console.log("Cleared chat history");

    // Delete all users
    const users = await client.query(api.users.getAllUsers);
    for (const user of users) {
      await client.mutation(api.users.deleteUser, { id: user._id });
    }
    console.log("Cleared users");

    // Delete all subscriptions
    const subscriptions = await client.query(api.subscriptions.getAllSubscriptions);
    for (const sub of subscriptions) {
      await client.mutation(api.subscriptions.deleteSubscription, { id: sub._id });
    }
    console.log("Cleared subscriptions");

    // Delete all feedback
    const feedback = await client.query(api.feedback.getAllFeedback);
    for (const item of feedback) {
      await client.mutation(api.feedback.deleteFeedback, { id: item._id });
    }
    console.log("Cleared feedback");

    console.log("Database cleared successfully!");
  } catch (error) {
    console.error("Error clearing database:", error);
  }
}

clearDatabase(); 