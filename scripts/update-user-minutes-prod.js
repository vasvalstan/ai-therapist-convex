// Script to update a user's minutes in Convex production
const { exec } = require('child_process');

// Get command line arguments
const email = process.argv[2];
const minutesToAdd = parseInt(process.argv[3], 10);

if (!email || isNaN(minutesToAdd)) {
  console.error("Usage: node update-user-minutes-prod.js <email> <minutesToAdd>");
  console.error("Example: node update-user-minutes-prod.js example@email.com 30");
  process.exit(1);
}

console.log(`Updating user with email ${email} with ${minutesToAdd} additional minutes...`);

// First, get all users to find the one with the matching email
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
    
    // Find the user with the matching email
    const user = users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      console.error(`User with email ${email} not found.`);
      return;
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
    const totalMinutesAllowed = user.totalMinutesAllowed ? user.totalMinutesAllowed + minutesToAdd : minutesToAdd;
    
    // Update the user using the Convex CLI
    const updateCommand = `npx convex run users:updateUserMinutes --prod '{"userId": "${user.userId}", "minutesRemaining": ${newMinutes}, "totalMinutesAllowed": ${totalMinutesAllowed}}'`;
    
    console.log(`Executing update command: ${updateCommand}`);
    
    exec(updateCommand, (updateError, updateStdout, updateStderr) => {
      if (updateError) {
        console.error(`Update error: ${updateError.message}`);
        return;
      }
      
      if (updateStderr) {
        console.error(`Update stderr: ${updateStderr}`);
        return;
      }
      
      try {
        // Parse the JSON output
        const result = JSON.parse(updateStdout);
        
        console.log("\nUser updated successfully!");
        console.log(`- New Minutes Remaining: ${result.minutesRemaining}`);
        console.log(`- Total Minutes Allowed: ${result.totalMinutesAllowed}`);
      } catch (parseError) {
        console.error("Error parsing update result:", parseError);
        console.log("Raw output:", updateStdout);
      }
    });
  } catch (parseError) {
    console.error("Error parsing user data:", parseError);
  }
}); 