// Script to view all users from Convex
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

async function viewUsers() {
  try {
    console.log("Querying users...");
    
    // Query all users
    // Note: In a real production app, you would want to add pagination for large datasets
    const users = await convex.query("users:getAllUsers");
    
    console.log(`Found ${users.length} users:`);
    console.log("-----------------------------------");
    
    // Display each user with relevant information
    users.forEach((user, index) => {
      console.log(`User #${index + 1} (ID: ${user._id}):`);
      console.log(`- Name: ${user.name || 'N/A'}`);
      console.log(`- Email: ${user.email || 'N/A'}`);
      console.log(`- User ID: ${user.userId}`);
      console.log(`- Token Identifier: ${user.tokenIdentifier}`);
      console.log(`- Current Plan: ${user.currentPlanKey || 'free'}`);
      console.log(`- Minutes Remaining: ${user.minutesRemaining !== undefined ? user.minutesRemaining : 'N/A'}`);
      console.log(`- Total Minutes Allowed: ${user.totalMinutesAllowed !== undefined ? user.totalMinutesAllowed : 'N/A'}`);
      console.log(`- Plan Renewal Date: ${user.planRenewalDate ? new Date(user.planRenewalDate).toLocaleString() : 'N/A'}`);
      console.log(`- Created At: ${user.createdAt ? new Date(user.createdAt).toLocaleString() : 'N/A'}`);
      console.log("-----------------------------------");
    });
    
  } catch (error) {
    console.error("Error querying users:", error);
  }
}

// Run the query
viewUsers(); 