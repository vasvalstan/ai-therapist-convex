import { ConvexHttpClient } from "convex/browser";
import dotenv from "dotenv";
import fs from "fs";

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" });

// Create a client for the production deployment
const client = new ConvexHttpClient("https://decisive-tiger-533.convex.cloud");

// Define a type for subscriptions
type Subscription = {
  _id: string;
  polarId: string;
  userId: string;
  status: string;
  [key: string]: any; // Allow for other properties
};

async function getSubscriptions() {
  try {
    // Get all users first
    const users = await (client as any).query("users:getAllUsers");
    
    // For each user, get their subscriptions
    let allSubscriptions: Subscription[] = [];
    for (const user of users) {
      try {
        const userSubscriptions = await (client as any).query("subscriptions:getUserSubscriptions", { 
          userId: user.tokenIdentifier 
        });
        
        if (userSubscriptions && userSubscriptions.length > 0) {
          allSubscriptions = [...allSubscriptions, ...userSubscriptions];
        }
      } catch (error) {
        console.error(`Error fetching subscriptions for user ${user.email}:`, error);
      }
    }
    
    console.log("Subscriptions from production deployment:");
    console.log(JSON.stringify(allSubscriptions, null, 2));
    
    // Save to file for reference
    fs.writeFileSync("prod-subscriptions.json", JSON.stringify(allSubscriptions, null, 2));
    console.log("Subscriptions saved to prod-subscriptions.json");
  } catch (error) {
    console.error("Error fetching subscriptions:", error);
  }
}

getSubscriptions(); 