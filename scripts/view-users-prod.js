// Script to view all users from Convex production
const { exec } = require('child_process');

console.log("Querying users from production environment...");

// Use the Convex CLI to run a function in production
exec('npx convex run users:getAllUsers --prod', (error, stdout, stderr) => {
  if (error) {
    console.error(`Error: ${error.message}`);
    return;
  }
  
  if (stderr) {
    console.error(`stderr: ${stderr}`);
    return;
  }
  
  try {
    // Parse the JSON output
    const users = JSON.parse(stdout);
    
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
    console.error("Error parsing user data:", error);
  }
}); 