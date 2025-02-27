import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: '.env.local' });

async function main() {
    const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

    try {
        console.log("Initializing plans in Convex...\n");
        await client.mutation(api.plans.initializePlans);
        
        console.log("Plans initialized. Fetching current plans...\n");
        const plans = await client.query(api.plans.getPlans);

        console.log("=== Current Plan Configuration ===\n");
        plans.forEach(plan => {
            console.log(`Plan: ${plan.name} (${plan.key})`);
            console.log(`Description: ${plan.description}`);
            console.log(`Product ID: ${plan.polarProductId}`);
            console.log("\nPricing:");
            
            if (plan.prices.month?.usd) {
                console.log(`  Monthly:`);
                console.log(`    Amount: $${plan.prices.month.usd.amount / 100}`);
                console.log(`    Price ID: ${plan.prices.month.usd.polarId}`);
            }
            
            if (plan.prices.year?.usd) {
                console.log(`  Yearly:`);
                console.log(`    Amount: $${plan.prices.year.usd.amount / 100}`);
                console.log(`    Price ID: ${plan.prices.year.usd.polarId}`);
            }
            
            console.log("\nFeatures:");
            plan.features?.forEach(feature => {
                console.log(`  - ${feature}`);
            });
            
            console.log(`\nSession Duration: ${plan.maxSessionDurationMinutes} minutes`);
            console.log(`Total Minutes: ${plan.totalMinutes} minutes`);
            console.log("\n---\n");
        });

    } catch (error) {
        console.error("Error initializing plans:", error);
    }
}

main(); 