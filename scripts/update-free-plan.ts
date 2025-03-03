import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import * as dotenv from "dotenv";
import path from "path";

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    
    if (!convexUrl) {
        throw new Error("NEXT_PUBLIC_CONVEX_URL is not set in .env.local");
    }
    
    const client = new ConvexHttpClient(convexUrl);

    try {
        console.log("Updating free plan configuration...\n");
        
        // Update the free plan
        await client.mutation(api.plans.updatePlan, {
            key: "free",
            updates: {
                description: "Try us out with one free session",
                features: [
                    "1 free session",
                    "10min session duration",
                    "basic ai voice model",
                    "limited session history"
                ],
                maxSessionDurationMinutes: 10,
                totalMinutes: 10,
                maxSessions: 1
            }
        });
        
        console.log("Free plan updated successfully!");
        console.log("\nNew Free Plan Configuration:");
        console.log("- 1 free session");
        console.log("- 10 minutes per session");
        console.log("- Total minutes: 10");
        
    } catch (error) {
        console.error("Error updating free plan:", error);
    }
}

main(); 