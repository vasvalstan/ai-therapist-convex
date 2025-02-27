import { ConvexHttpClient } from "convex/browser";
import dotenv from "dotenv";
import fs from "fs";

// Load environment variables
dotenv.config({ path: ".env.local" });

// Create a client for the production deployment
const client = new ConvexHttpClient(
  "https://decisive-tiger-533.convex.cloud"
);

async function getPlans() {
  try {
    // Fetch all plans from the production deployment using a raw query
    // This bypasses the type checking since we don't have the production API types
    const plans = await (client as any).query("plans:getAllPlans");
    
    console.log("Plans from production deployment:");
    console.log(JSON.stringify(plans, null, 2));
    
    // Save to a file for reference
    fs.writeFileSync("prod-plans.json", JSON.stringify(plans, null, 2));
    console.log("Plans saved to prod-plans.json");
  } catch (error) {
    console.error("Error fetching plans:", error);
  }
}

getPlans(); 