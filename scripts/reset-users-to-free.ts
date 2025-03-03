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
        console.log("Resetting all users to free plan...\n");
        
        // Get the free plan details
        const plans = await client.query(api.plans.getPlans);
        const freePlan = plans.find(plan => plan.key === "free");
        
        if (!freePlan) {
            throw new Error("Free plan not found");
        }
        
        // Get all users
        const users = await client.query(api.users.getAllUsers);
        
        console.log(`Found ${users.length} users to reset`);
        
        // Reset each user to free plan
        for (const user of users) {
            await client.mutation(api.plans.updateUserPlanByEmail, {
                email: user.email,
                planKey: "free"
            });
            console.log(`Reset user ${user.email} to free plan`);
        }
        
        console.log("\nAll users have been reset to free plan!");
        console.log("\nFree Plan Configuration:");
        console.log("- 1 free session");
        console.log("- 10 minutes per session");
        console.log("- Total minutes: 10");
        
    } catch (error) {
        console.error("Error resetting users:", error);
    }
}

main(); 