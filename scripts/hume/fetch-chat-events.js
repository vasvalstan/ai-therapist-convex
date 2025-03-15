require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');

// Chat IDs from the user query
const CHAT_ID = 'cba0b61a-b6d9-40b5-a403-49a50ec84b9e';
const CHAT_GROUP_ID = 'f677a372-f465-4db6-a09d-3fb1a9509ff2';

// Get API key from environment variables
const HUME_API_KEY = process.env.HUME_API_KEY;

if (!HUME_API_KEY) {
  console.error('Error: HUME_API_KEY is not defined in .env.local');
  process.exit(1);
}

// Function to fetch chat events for a specific chat
async function fetchChatEvents(chatId) {
  console.log(`Fetching events for chat ID: ${chatId}`);
  
  try {
    // Updated URL to match the correct Hume API endpoint format
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

// Function to fetch events for a chat group
async function fetchChatGroupEvents(chatGroupId) {
  console.log(`Fetching events for chat group ID: ${chatGroupId}`);
  
  try {
    // Updated URL to match the correct Hume API endpoint format
    const response = await fetch(`https://api.hume.ai/v0/evi/chat_groups/${chatGroupId}`, {
      method: 'GET',
      headers: {
        'X-Hume-Api-Key': HUME_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch chat group events: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching chat group events:', error);
    return null;
  }
}

// Function to generate a transcript from chat events
function generateTranscript(chatEvents) {
  if (!chatEvents || chatEvents.length === 0) {
    return 'No events found';
  }

  // Filter events for user and assistant messages
  const relevantChatEvents = chatEvents.filter(
    (chatEvent) => 
      chatEvent.type === 'USER_MESSAGE' || 
      chatEvent.type === 'AGENT_MESSAGE' ||
      chatEvent.type === 'user_message' || 
      chatEvent.type === 'assistant_message'
  );

  // Map each relevant event to a formatted line
  const transcriptLines = relevantChatEvents.map((chatEvent) => {
    const role = 
      chatEvent.role === 'USER' || chatEvent.type === 'user_message' 
        ? 'User' 
        : 'Assistant';
    const timestamp = new Date(chatEvent.timestamp).toLocaleString();
    const message = chatEvent.message_text || chatEvent.messageText || (chatEvent.message ? chatEvent.message.content : '');
    return `[${timestamp}] ${role}: ${message}`;
  });

  // Join all lines into a single transcript string
  return transcriptLines.join('\n');
}

// Function to analyze emotions from chat events
function analyzeEmotions(chatEvents) {
  if (!chatEvents || chatEvents.length === 0) {
    return 'No events found for emotion analysis';
  }

  // Extract user messages that have emotion features
  const userMessages = chatEvents.filter(
    (event) => 
      (event.role === 'USER' || event.type === 'USER_MESSAGE' || event.type === 'user_message') && 
      (event.emotion_features || event.emotionFeatures || (event.models && event.models.prosody))
  );

  if (userMessages.length === 0) {
    return 'No user messages with emotion data found';
  }

  // Calculate average emotion scores
  const emotionSums = {};
  let totalMessages = 0;
  
  userMessages.forEach(event => {
    let emotions;
    
    if (event.emotion_features) {
      // Handle emotion_features from Hume API
      try {
        emotions = typeof event.emotion_features === 'string' 
          ? JSON.parse(event.emotion_features) 
          : event.emotion_features;
      } catch (e) {
        console.log('Error parsing emotion_features:', e);
        return; // Skip this event if parsing fails
      }
    } else if (event.emotionFeatures) {
      // Handle emotionFeatures from local database
      try {
        emotions = typeof event.emotionFeatures === 'string' 
          ? JSON.parse(event.emotionFeatures) 
          : event.emotionFeatures;
      } catch (e) {
        console.log('Error parsing emotionFeatures:', e);
        return; // Skip this event if parsing fails
      }
    } else if (event.models && event.models.prosody) {
      // Handle prosody scores
      emotions = event.models.prosody.scores;
    } else {
      return; // Skip this event if no emotion data
    }
    
    if (!emotions) {
      return; // Skip if emotions is null or undefined
    }
    
    totalMessages++;
    
    Object.entries(emotions).forEach(([emotion, score]) => {
      emotionSums[emotion] = (emotionSums[emotion] || 0) + score;
    });
  });
  
  // Calculate averages
  const averageEmotions = {};
  if (totalMessages > 0) {
    Object.entries(emotionSums).forEach(([emotion, sum]) => {
      averageEmotions[emotion] = sum / totalMessages;
    });
  }
  
  return averageEmotions;
}

// Main function to run the script
async function main() {
  // Create output directory if it doesn't exist
  const outputDir = path.join(__dirname, 'output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Fetch individual chat events
  const chatData = await fetchChatEvents(CHAT_ID);
  if (chatData) {
    console.log(`Retrieved chat data for chat ID: ${CHAT_ID}`);
    
    // Save raw chat data
    fs.writeFileSync(
      path.join(outputDir, `chat_data_${CHAT_ID}.json`), 
      JSON.stringify(chatData, null, 2)
    );
    
    // Extract events from the events_page property
    const chatEvents = chatData.events_page || [];
    
    if (chatEvents.length > 0) {
      console.log(`Found ${chatEvents.length} events in the chat`);
      
      // Save events separately
      fs.writeFileSync(
        path.join(outputDir, `chat_events_${CHAT_ID}.json`), 
        JSON.stringify(chatEvents, null, 2)
      );
      
      // Generate and save transcript
      const transcript = generateTranscript(chatEvents);
      fs.writeFileSync(
        path.join(outputDir, `transcript_${CHAT_ID}.txt`), 
        transcript
      );
      
      // Analyze and save emotions
      const emotions = analyzeEmotions(chatEvents);
      fs.writeFileSync(
        path.join(outputDir, `emotions_${CHAT_ID}.json`), 
        JSON.stringify(emotions, null, 2)
      );
    } else {
      console.log('No events found in the chat data');
    }
  }

  // Fetch chat group events
  const chatGroupData = await fetchChatGroupEvents(CHAT_GROUP_ID);
  if (chatGroupData) {
    console.log(`Retrieved chat group data for chat group ID: ${CHAT_GROUP_ID}`);
    
    // Save raw chat group data
    fs.writeFileSync(
      path.join(outputDir, `chat_group_data_${CHAT_GROUP_ID}.json`), 
      JSON.stringify(chatGroupData, null, 2)
    );
    
    // Extract chats from the chats_page property
    const chats = chatGroupData.chats_page || [];
    
    if (chats.length > 0) {
      console.log(`Found ${chats.length} chats in the chat group`);
      
      // Save chats separately
      fs.writeFileSync(
        path.join(outputDir, `chat_group_chats_${CHAT_GROUP_ID}.json`), 
        JSON.stringify(chats, null, 2)
      );
      
      // For each chat in the group, fetch its events
      console.log('Fetching events for each chat in the group...');
      
      for (const chat of chats) {
        const chatId = chat.id;
        console.log(`Processing chat ID: ${chatId}`);
        
        // Skip if it's the same as the individual chat we already processed
        if (chatId === CHAT_ID) {
          console.log(`Skipping chat ID ${chatId} as it was already processed`);
          continue;
        }
        
        // Fetch events for this chat
        const chatData = await fetchChatEvents(chatId);
        
        if (chatData && chatData.events_page) {
          const chatEvents = chatData.events_page;
          console.log(`Found ${chatEvents.length} events in chat ID: ${chatId}`);
          
          // Save events
          fs.writeFileSync(
            path.join(outputDir, `chat_events_${chatId}.json`), 
            JSON.stringify(chatEvents, null, 2)
          );
          
          // Generate transcript
          const transcript = generateTranscript(chatEvents);
          fs.writeFileSync(
            path.join(outputDir, `transcript_${chatId}.txt`), 
            transcript
          );
        }
      }
    } else {
      console.log('No chats found in the chat group data');
    }
  }
  
  console.log('Script completed successfully!');
}

// Run the script
main().catch(error => {
  console.error('Script execution failed:', error);
  process.exit(1);
}); 