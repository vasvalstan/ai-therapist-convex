// Script to query feedback entries from Convex
const { ConvexHttpClient } = require("convex/browser");
require('dotenv').config({ path: '.env.local' });

// Initialize the Convex client
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

async function queryFeedback() {
  try {
    console.log("Querying feedback entries...");
    
    // Query all feedback entries
    const feedbackEntries = await convex.query("feedback:getAllFeedback");
    
    console.log(`Found ${feedbackEntries.length} feedback entries:`);
    console.log("-----------------------------------");
    
    // Display each feedback entry
    feedbackEntries.forEach((entry, index) => {
      console.log(`Entry #${index + 1}:`);
      console.log(`- Message: "${entry.message}"`);
      console.log(`- Created: ${new Date(entry.createdAt).toLocaleString()}`);
      console.log(`- Source: ${entry.source || 'N/A'}`);
      console.log(`- User ID: ${entry.userId || 'Anonymous'}`);
      console.log(`- Session ID: ${entry.sessionId || 'N/A'}`);
      console.log("-----------------------------------");
    });
    
  } catch (error) {
    console.error("Error querying feedback:", error);
  }
}

// Run the query
queryFeedback(); 