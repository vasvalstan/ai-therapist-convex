// Script to update a user's minutes in Convex
const { ConvexHttpClient } = require("convex/browser");
require('dotenv').config({ path: '.env.local' });

// Initialize the Convex client with production URL
// Use NEXT_PUBLIC_CONVEX_URL for dev or NEXT_PUBLIC_CONVEX_SITE_URL for prod
const isProd = process.argv.includes('--prod');
const convexUrl = isProd 
  ? process.env.NEXT_PUBLIC_CONVEX_SITE_URL 
  : process.env.NEXT_PUBLIC_CONVEX_URL;

console.log(`Using ${isProd ? 'PRODUCTION' : 'DEVELOPMENT'} environment`);
const convex = new ConvexHttpClient(convexUrl);

// Get command line arguments
// Check if we're using email or userId
const isEmail = process.argv.includes('--email');
const userIdentifier = process.argv[2];
const minutesToAdd = parseInt(process.argv[3], 10);

if (!userIdentifier || isNaN(minutesToAdd)) {
  console.error("Usage: node update-user-minutes.js <userId|email> <minutesToAdd> [--prod] [--email]");
  console.error("Examples:");
  console.error("  node update-user-minutes.js user_2aX7PsZdKvQW 30");
  console.error("  node update-user-minutes.js user_2aX7PsZdKvQW 30 --prod");
  console.error("  node update-user-minutes.js example@email.com 30 --email");
  console.error("  node update-user-minutes.js example@email.com 30 --email --prod");
  process.exit(1);
}

async function updateUserMinutes() {
  try {
    console.log(`Updating user ${userIdentifier} with ${minutesToAdd} additional minutes...`);
    
    // First, get the current user details
    let user;
    
    if (isEmail) {
      console.log(`Finding user by email: ${userIdentifier}`);
      // Get all users and find the one with the matching email
      const users = await convex.query("users:getAllUsers");
      user = users.find(u => u.email && u.email.toLowerCase() === userIdentifier.toLowerCase());
      
      if (!user) {
        console.error(`User with email ${userIdentifier} not found.`);
        return;
      }
    } else {
      console.log(`Finding user by ID: ${userIdentifier}`);
      user = await convex.query("users:getUserById", { userId: userIdentifier });
      
      if (!user) {
        console.error(`User with ID ${userIdentifier} not found.`);
        return;
      }
    }
    
    console.log("Current user details:");
    console.log(`- Name: ${user.name || 'N/A'}`);
    console.log(`- Email: ${user.email || 'N/A'}`);
    console.log(`- User ID: ${user.userId}`);
    console.log(`- Current Plan: ${user.currentPlanKey || 'free'}`);
    console.log(`- Current Minutes Remaining: ${user.minutesRemaining !== undefined ? user.minutesRemaining : 'N/A'}`);
    
    // Calculate new minutes
    const currentMinutes = user.minutesRemaining || 0;
    const newMinutes = currentMinutes + minutesToAdd;
    
    // Update the user
    const result = await convex.mutation("users:updateUserMinutes", { 
      userId: user.userId, 
      minutesRemaining: newMinutes,
      // Optionally update total minutes allowed if needed
      totalMinutesAllowed: user.totalMinutesAllowed ? user.totalMinutesAllowed + minutesToAdd : minutesToAdd
    });
    
    console.log("\nUser updated successfully!");
    console.log(`- New Minutes Remaining: ${result.minutesRemaining}`);
    console.log(`- Total Minutes Allowed: ${result.totalMinutesAllowed}`);
    
  } catch (error) {
    console.error("Error updating user:", error);
  }
}

// Run the update
updateUserMinutes(); 