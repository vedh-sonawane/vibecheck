import { App } from '@slack/bolt';
import dotenv from 'dotenv';
import { storeUser, storeMessageMetadata, getUserRecentPattern } from './database/queries';
import { getUserMessageHistory } from './services/rts';

dotenv.config();

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
});

// Enhanced /vibecheck command
app.command('/vibecheck', async ({ command, ack, respond, client }) => {
  await ack();
  
  try {
    // Get user info
    const userInfo = await client.users.info({ user: command.user_id });
    const user = userInfo.user;
    
    // Store user
    await storeUser(
      command.user_id,
      user?.name,
      user?.real_name
    );
    
    // Get recent pattern
    const pattern = await getUserRecentPattern(command.user_id, 7);
    
    const totalMessages = pattern.reduce((sum, day) => sum + parseInt(day.message_count), 0);
    const lateNightMessages = pattern.reduce((sum, day) => sum + parseInt(day.late_night_count), 0);
    
    await respond({
      text: `Vibe Check for <@${command.user_id}>`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Vibe Check Status:* ✅ Online\n\n*Your 7-Day Pattern:*\n• Messages sent: ${totalMessages}\n• Late-night messages (10pm-6am): ${lateNightMessages}\n• Pattern: ${lateNightMessages > 5 ? '⚠️ High late-night activity' : '☀️ Healthy pattern'}`
          }
        }
      ]
    });
  } catch (error) {
    console.error('Error in /vibecheck:', error);
    await respond('Something went wrong! Check logs.');
  }
});

// Listen for messages and store metadata
app.message(async ({ message, client }) => {
  if (message.subtype === undefined && 'user' in message) {
    try {
      // Get user info
      const userInfo = await client.users.info({ user: message.user });
      
      // Store user
      await storeUser(
        message.user,
        userInfo.user?.name,
        userInfo.user?.real_name
      );
      
      // Store message metadata (NO CONTENT!)
      await storeMessageMetadata({
        userId: message.user,
        channelId: message.channel,
        timestamp: message.ts,
        threadTs: message.thread_ts,
        reactionCount: 0
      });
      
      console.log(`✅ Stored metadata for message from ${userInfo.user?.name}`);
    } catch (error) {
      console.error('Error storing message:', error);
    }
  }
});

// Background job: Backfill historical data
async function backfillHistoricalData() {
  console.log('🔄 Starting historical data backfill...');
  
  try {
    // Get all workspace users
    const usersResult = await app.client.users.list({});
    const users = usersResult.members?.filter(u => !u.is_bot && !u.deleted) || [];
    
    for (const user of users.slice(0, 5)) { // Limit to 5 users for now
      if (!user.id) continue;
      
      console.log(`Backfilling data for ${user.name}...`);
      
      // Get their message history via RTS
      const messages = await getUserMessageHistory(user.id, 30);
      
      console.log(`Found ${messages.length} messages for ${user.name}`);
      
      // Store user
      await storeUser(user.id, user.name, user.real_name);
      
      // Store each message's metadata
      for (const msg of messages) {
        if (msg.ts) {
       await storeMessageMetadata({
  userId: user.id,
  channelId: msg.channel?.id || 'unknown',
  timestamp: msg.ts,
  threadTs: (msg as any).thread_ts,
  reactionCount: 0,
});
        }
      }
    }
    
    console.log('✅ Historical data backfill complete!');
  } catch (error) {
    console.error('Error in backfill:', error);
  }
}

(async () => {
  const port = process.env.PORT || 3000;
  await app.start(port);
  console.log(`⚡️ Vibe Check is running on port ${port}`);
  
  // Run backfill on startup (comment out after first run)
  setTimeout(backfillHistoricalData, 5000);
})();