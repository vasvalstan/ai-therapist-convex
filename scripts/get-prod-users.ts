import { ConvexHttpClient } from "convex/browser";
import dotenv from "dotenv";
import fs from "fs";

// Load environment variables
dotenv.config({ path: ".env.local" });

// Create a client for the production deployment
const client = new ConvexHttpClient(
  "https://decisive-tiger-533.convex.cloud"
);

async function getUsers() {
  try {
    // Fetch all users from the production deployment using a raw query
    const users = await (client as any).query("users:getAllUsers");
    
    console.log("Users from production deployment:");
    console.log(JSON.stringify(users, null, 2));
    
    // Save to a file for reference
    fs.writeFileSync("prod-users.json", JSON.stringify(users, null, 2));
    console.log("Users saved to prod-users.json");
  } catch (error) {
    console.error("Error fetching users:", error);
  }
}

getUsers(); 