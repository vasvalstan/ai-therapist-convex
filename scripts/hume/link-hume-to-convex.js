require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const { ConvexClient } = require('convex/browser');

// Hume chat IDs from the user query
const HUME_CHAT_ID = 'cba0b61a-b6d9-40b5-a403-49a50ec84b9e';
const HUME_CHAT_GROUP_ID = 'f677a372-f465-4db6-a09d-3fb1a9509ff2';

// Get API keys from environment variables
const HUME_API_KEY = process.env.HUME_API_KEY;
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;

if (!HUME_API_KEY) {
  console.error('Error: HUME_API_KEY is not defined in .env.local');
  process.exit(1);
}

if (!CONVEX_URL) {
  console.error('Error: NEXT_PUBLIC_CONVEX_URL is not defined in .env.local');
  process.exit(1);
}

// Function to fetch chat events from Hume
async function fetchHumeChatEvents(chatId) {
  console.log(`Fetching events for Hume chat ID: ${chatId}`);
  
  try {
    const response = await fetch(`https://api.hume.ai/v0/evi/chats/${chatId}`, {
      method: 'GET',
      headers: {
        'X-Hume-Api-Key': HUME_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch chat events: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching chat events:', error);
    return null;
  }
}

// Function to find potential matching chats in Convex
async function findPotentialMatches(humeEvents) {
  console.log('Analyzing Hume events to find potential matches in Convex...');
  
  if (!humeEvents || !humeEvents.events_page || humeEvents.events_page.length === 0) {
    console.log('No events found in Hume chat');
    return [];
  }
  
  // Extract user messages from Hume events
  const userMessages = humeEvents.events_page
    .filter(event => event.role === 'USER')
    .map(event => ({
      text: event.message_text,
      timestamp: event.timestamp
    }));
  
  if (userMessages.length === 0) {
    console.log('No user messages found in Hume chat');
    return [];
  }
  
  console.log(`Found ${userMessages.length} user messages in Hume chat`);
  console.log('First user message:', userMessages[0].text);
  
  // Create a Convex client
  const client = new ConvexClient(CONVEX_URL);
  
  // Get all chat sessions from Convex
  try {
    // Note: This is a simplified approach. In a real implementation,
    // you would need to authenticate with Convex and use the proper API.
    // This is just a conceptual example.
    console.log('This script needs to be adapted to use your Convex authentication mechanism');
    console.log('For now, it will just provide guidance on how to link the chats');
    
    return [];
  } catch (error) {
    console.error('Error querying Convex:', error);
    return [];
  }
}

// Function to update Convex with Hume IDs
async function updateConvexWithHumeIds(convexChatId, humeChatId, humeGroupChatId) {
  console.log(`Updating Convex chat ${convexChatId} with Hume IDs: ${humeChatId}, ${humeGroupChatId}`);
  
  try {
    // Note: This is a simplified approach. In a real implementation,
    // you would need to authenticate with Convex and use the proper API.
    console.log('This script needs to be adapted to use your Convex authentication mechanism');
    console.log('For now, it will just provide guidance on how to link the chats');
    
    return true;
  } catch (error) {
    console.error('Error updating Convex:', error);
    return false;
  }
}

// Main function to run the script
async function main() {
  // Create output directory if it doesn't exist
  const outputDir = path.join(__dirname, 'output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Fetch Hume chat data
  const humeChatData = await fetchHumeChatEvents(HUME_CHAT_ID);
  if (!humeChatData) {
    console.error('Failed to fetch Hume chat data');
    return;
  }
  
  // Save Hume chat data for reference
  fs.writeFileSync(
    path.join(outputDir, `hume_chat_${HUME_CHAT_ID}.json`), 
    JSON.stringify(humeChatData, null, 2)
  );
  
  // Find potential matches in Convex
  const potentialMatches = await findPotentialMatches(humeChatData);
  
  if (potentialMatches.length === 0) {
    console.log('No potential matches found in Convex database');
    console.log('\nTo manually link this Hume chat with a Convex chat:');
    console.log('1. Find the Convex chatId you want to link with');
    console.log('2. Run the following Convex mutation:');
    console.log(`
    await ctx.db.patch(convexChatId, {
      humeChatId: "${HUME_CHAT_ID}",
      humeGroupChatId: "${HUME_CHAT_GROUP_ID}"
    });
    `);
    return;
  }
  
  console.log(`Found ${potentialMatches.length} potential matches in Convex database`);
  
  // For each potential match, provide update instructions
  for (const match of potentialMatches) {
    console.log(`\nPotential match: ${match.id}`);
    console.log(`First message: ${match.firstMessage}`);
    console.log(`To update this Convex chat with Hume IDs, run:`);
    console.log(`
    await ctx.db.patch("${match.id}", {
      humeChatId: "${HUME_CHAT_ID}",
      humeGroupChatId: "${HUME_CHAT_GROUP_ID}"
    });
    `);
  }
  
  console.log('\nScript completed successfully!');
}

// Run the script
main().catch(error => {
  console.error('Script execution failed:', error);
  process.exit(1); 