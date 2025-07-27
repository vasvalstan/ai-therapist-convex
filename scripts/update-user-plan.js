const { exec } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);

// Get command line arguments
const userEmail = process.argv[2];
const planKey = process.argv[3]; // 'free', 'basic', or 'premium'

if (!userEmail || !planKey) {
  console.error(
    "Usage: node scripts/update-user-plan.js <user_email> <plan_key>"
  );
  console.error(
    "Example: node scripts/update-user-plan.js user@example.com monthly"
  );
  console.error("Available plans: monthly, yearly");
  process.exit(1);
}

// Validate plan key
if (!["monthly", "yearly"].includes(planKey)) {
  console.error("Error: Plan key must be one of: monthly, yearly");
  process.exit(1);
}

async function updateUserPlan() {
  try {
    console.log(`Fetching user with email: ${userEmail}...`);

    // First, get all users to find the one with the matching email
    const { stdout: usersOutput } = await execPromise(
      "npx convex run users:getAllUsers --prod"
    );
    const users = JSON.parse(usersOutput);

    // Find the user with the matching email
    const user = users.find((u) => u.email === userEmail);

    if (!user) {
      console.error(`Error: User with email ${userEmail} not found`);
      process.exit(1);
    }

    console.log(`Found user:`);
    console.log(`- Name: ${user.name || "N/A"}`);
    console.log(`- Email: ${user.email}`);
    console.log(`- User ID: ${user.userId}`);
    console.log(`- Current Plan: ${user.currentPlanKey || "free"}`);
    console.log(
      `- Current Minutes Remaining: ${user.minutesRemaining !== undefined ? user.minutesRemaining : "N/A"}`
    );

    // Get plan details
    const { stdout: plansOutput } = await execPromise(
      "npx convex run plans:getPlans --prod"
    );
    const plans = JSON.parse(plansOutput);
    const plan = plans.find((p) => p.key === planKey);

    if (!plan) {
      console.error(`Error: Plan with key ${planKey} not found`);
      process.exit(1);
    }

    console.log(`\nUpdating user to plan: ${planKey}`);
    console.log(`- Plan Name: ${plan.name}`);
    console.log(`- Total Minutes: ${plan.totalMinutes}`);
    console.log(
      `- Max Session Duration: ${plan.maxSessionDurationMinutes} minutes`
    );

    // Create a temporary file with our custom function
    const fs = require("fs");
    const path = require("path");
    const tempFilePath = path.join(__dirname, "temp-update-plan.js");

    const functionCode = `
    import { mutation } from "../_generated/server";
    
    export default mutation({
      handler: async (ctx) => {
        // Find the user
        const user = await ctx.db
          .query("users")
          .filter((q) => q.eq(q.field("email"), "${userEmail}"))
          .unique();
        
        if (!user) {
          return { success: false, error: "User not found" };
        }
        
        // Get the plan details
        const plan = await ctx.db
          .query("plans")
          .withIndex("key", (q) => q.eq("key", "${planKey}"))
          .unique();
        
        if (!plan) {
          return { success: false, error: "Plan not found" };
        }
        
        // Calculate renewal date (1 month from now)
        const now = new Date();
        const renewalDate = new Date(now.setMonth(now.getMonth() + 1)).getTime();
        
        // Update the user with the new plan details
        await ctx.db.patch(user._id, {
          currentPlanKey: "${planKey}",
          minutesRemaining: plan.totalMinutes || 0,
          totalMinutesAllowed: plan.totalMinutes || 0,
          planRenewalDate: renewalDate
        });
        
        return { 
          success: true, 
          message: "User plan updated successfully",
          plan: plan.key,
          minutes: plan.totalMinutes,
          maxSessionDuration: plan.maxSessionDurationMinutes
        };
      }
    });
    `;

    // Create the convex/temp directory if it doesn't exist
    const tempDirPath = path.join(__dirname, "..", "convex", "temp");
    if (!fs.existsSync(tempDirPath)) {
      fs.mkdirSync(tempDirPath, { recursive: true });
    }

    // Write the temporary function file
    const tempFunctionPath = path.join(tempDirPath, "updatePlanTemp.ts");
    fs.writeFileSync(tempFunctionPath, functionCode);

    console.log("\nDeploying temporary function...");
    await execPromise("npx convex deploy");

    console.log("\nRunning update function...");
    const { stdout: updateOutput } = await execPromise(
      "npx convex run temp:updatePlanTemp --prod"
    );
    const updateResult = JSON.parse(updateOutput);

    // Clean up the temporary file
    fs.unlinkSync(tempFunctionPath);
    console.log("\nCleaned up temporary function");

    if (updateResult.success) {
      console.log("\nUser plan updated successfully!");
      console.log(`- New Plan: ${updateResult.plan}`);
      console.log(`- Minutes Remaining: ${updateResult.minutes}`);
      console.log(
        `- Max Session Duration: ${updateResult.maxSessionDuration} minutes`
      );
    } else {
      console.error(`\nError updating user plan: ${updateResult.error}`);
    }
  } catch (error) {
    console.error("Error:", error.message);
    if (error.stdout) console.error("Output:", error.stdout);
    if (error.stderr) console.error("Error output:", error.stderr);
    process.exit(1);
  }
}

updateUserPlan();
