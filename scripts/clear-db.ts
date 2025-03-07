import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

// Create a client for the development deployment
const client = new ConvexHttpClient("https://vivid-warthog-65.convex.cloud");

async function clearDatabase() {
  try {
    // Delete all users
    const result = await client.mutation(api.users.deleteAllUsers);
    console.log(result);

    console.log("Database cleared successfully!");
  } catch (error) {
    console.error("Error clearing database:", error);
  }
}

clearDatabase(); 