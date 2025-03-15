require('dotenv').config({ path: '.env.local' });

// Hume chat IDs from the user query
const HUME_CHAT_ID = 'cba0b61a-b6d9-40b5-a403-49a50ec84b9e';
const HUME_CHAT_GROUP_ID = 'f677a372-f465-4db6-a09d-3fb1a9509ff2';

// This script provides instructions for updating a Convex chat entry with Hume IDs
console.log('To update a Convex chat entry with Hume IDs:');
console.log('\n1. Go to the Convex dashboard at: https://dashboard.convex.dev');
console.log('2. Navigate to your project');
console.log('3. Open the "Data" tab');
console.log('4. Select the "chatHistory" table');
console.log('5. Find the chat entry you want to update');
console.log('6. Click on the entry to open it');
console.log('7. Click "Edit"');
console.log('8. Add the following fields:');
console.log(`   - humeChatId: "${HUME_CHAT_ID}"`);
console.log(`   - humeGroupChatId: "${HUME_CHAT_GROUP_ID}"`);
console.log('9. Click "Save"');

console.log('\nAlternatively, you can use the Convex CLI to run a mutation:');
console.log('1. Create a new file in your convex/functions directory, e.g., updateHumeIds.ts');
console.log('2. Add the following code:');

console.log(`
import { mutation } from "../_generated/server";
import { v } from "convex/values";

export const updateHumeIds = mutation({
  args: {
    convexChatId: v.id("chatHistory"),
    humeChatId: v.string(),
    humeGroupChatId: v.string()
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.convexChatId, {
      humeChatId: args.humeChatId,
      humeGroupChatId: args.humeGroupChatId
    });
    
    return { success: true };
  }
});
`);

console.log('\n3. Then run the mutation using the Convex dashboard or from your application:');
console.log(`
// Replace "convexChatId" with the actual ID of the chat entry you want to update
await client.mutation("updateHumeIds", {
  convexChatId: "your_convex_chat_id",
  humeChatId: "${HUME_CHAT_ID}",
  humeGroupChatId: "${HUME_CHAT_GROUP_ID}"
});
`);

console.log('\nNote: Your application already has a mutation called "updateHumeChatIds" in convex/chat.ts');
console.log('You can use that mutation directly from your application code:');
console.log(`
// In your React component:
const updateChatIds = useMutation(api.chat.updateHumeChatIds);

// Then call it:
await updateChatIds({
  chatId: "your_convex_chat_id",
  humeChatId: "${HUME_CHAT_ID}",
  humeGroupChatId: "${HUME_CHAT_GROUP_ID}"
});
`); 