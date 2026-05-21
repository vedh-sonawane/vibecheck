import { App } from '@slack/bolt';
import dotenv from 'dotenv';

dotenv.config();

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
});

// Test command
app.command('/vibecheck', async ({ command, ack, respond }) => {
  await ack();
  
  await respond({
    text: `Hey <@${command.user_id}>! Vibe Check is online 🎯`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Vibe Check Status:* ✅ Online\n\nI'm monitoring team health patterns. More features coming soon!`
        }
      }
    ]
  });
});

// Listen for messages (we'll use this later)
app.message(async ({ message }) => {
  // Type guard to handle different message event types
  if (message.subtype === undefined && 'user' in message) {
    console.log('Message received:', {
      user: message.user,
      ts: message.ts,
      channel: message.channel
    });
  }
});

(async () => {
  const port = process.env.PORT || 3000;
  await app.start(port);
  console.log(`⚡️ Vibe Check is running on port 3000`);
})();