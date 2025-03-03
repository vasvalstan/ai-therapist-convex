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
        console.log("Checking user details...\n");
        
        // Get user by email
        const user = await client.query(api.users.getUserByEmail, {
            email: "valstan.devops@gmail.com"
        });
        
        if (!user) {
            throw new Error("User not found");
        }
        
        console.log("User Details:");
        console.log("-------------");
        console.log(`Email: ${user.email}`);
        console.log(`Current Plan: ${user.currentPlanKey || 'free'}`);
        console.log(`Minutes Remaining: ${user.minutesRemaining || 0}`);
        console.log(`Total Minutes Allowed: ${user.totalMinutesAllowed || 0}`);
        console.log(`Plan Renewal Date: ${new Date(user.planRenewalDate || 0).toLocaleString()}`);
        
        // Get the user's plan details
        const plans = await client.query(api.plans.getPlans);
        const userPlan = plans.find(plan => plan.key === (user.currentPlanKey || 'free'));
        
        if (userPlan) {
            console.log("\nPlan Details:");
            console.log("-------------");
            console.log(`Plan Name: ${userPlan.name}`);
            console.log(`Description: ${userPlan.description}`);
            console.log(`Max Session Duration: ${userPlan.maxSessionDurationMinutes} minutes`);
            console.log(`Total Minutes: ${userPlan.totalMinutes} minutes`);
            console.log(`Max Sessions: ${userPlan.maxSessions || 'unlimited'}`);
            console.log("\nFeatures:");
            userPlan.features?.forEach(feature => console.log(`- ${feature}`));
        }
        
    } catch (error) {
        console.error("Error checking user:", error);
    }
}

main(); 