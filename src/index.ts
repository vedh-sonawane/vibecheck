import { App } from '@slack/bolt';
import dotenv from 'dotenv';
import { storeUser, storeMessageMetadata } from './database/queries';
import { getUserMessageHistory } from './services/rts';
import { analyzeUserHealth } from './services/patternAnalyzer';
import { buildUserHealthReport, buildRichTeamDashboard } from './services/dashboard';
import { createTeamHealthCanvas } from './services/canvasBuilder';
import { sendManagerAlerts } from './services/managerAlerts';

dotenv.config();

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
});

app.command('/vibecheck', async ({ command, ack, respond, client }) => {
  await ack();

  try {
    const args = command.text.trim().split(' ');
    const option = args[0];

    if (option === 'dashboard') {
      await respond({ text: '📊 Creating team health dashboard...', response_type: 'ephemeral' });

      // Pass user ID so canvas is owned by and shared with the user
      const canvasId = await createTeamHealthCanvas(command.user_id);

      await client.chat.postMessage({
        channel: command.channel_id,
        text: 'Team Health Dashboard',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `📊 *Team Health Dashboard Created!*\n\n✅ Canvas ID: \`${canvasId}\`\n\n*To view it:*\n1. Click the 📄 *Canvases* icon in your Slack sidebar\n2. Look under *"Shared with you"* or *"Created by you"*\n3. Look for *"Team Health Dashboard"*`
            }
          }
        ]
      });

    } else if (option === 'team') {
      const dashboardBlocks = await buildRichTeamDashboard();
      await respond({ text: 'Team Health Dashboard', blocks: dashboardBlocks });

    } else {
      let targetUserId = command.user_id;
      if (option && option.startsWith('<@')) {
        targetUserId = option.replace('<@', '').replace('>', '').split('|')[0];
      }

      const userInfo = await client.users.info({ user: targetUserId });
      const user = userInfo.user;
      const health = await analyzeUserHealth(targetUserId);
      const reportBlocks = buildUserHealthReport(health);

      await respond({
        text: `Health Report for ${user?.real_name || user?.name}`,
        blocks: reportBlocks
      });
    }

  } catch (error) {
    console.error('Error in /vibecheck:', error);
    await respond({ text: '❌ Something went wrong!', response_type: 'ephemeral' });
  }
});

app.command('/vibecheck-alert', async ({ command, ack, respond }) => {
  await ack();

  try {
    const health = await analyzeUserHealth(command.user_id);

    if (health.alerts.length === 0) {
      await respond({ text: '✅ No alerts detected. Your patterns look healthy!', response_type: 'ephemeral' });
      return;
    }

    const alertBlocks: any[] = [
      { type: 'header', text: { type: 'plain_text', text: `⚠️ ${health.alerts.length} Alert(s) Detected` } }
    ];

    health.alerts.forEach(alert => {
      alertBlocks.push({
        type: 'section',
        text: { type: 'mrkdwn', text: `*${alert.type}*\n${alert.description}\n_Severity: ${alert.severity}_` }
      });
    });

    await respond({ text: 'Health Alerts', blocks: alertBlocks, response_type: 'ephemeral' });

  } catch (error) {
    console.error('Error checking alerts:', error);
    await respond('Error checking alerts!');
  }
});

app.message(async ({ message, client }) => {
  if (message.subtype === undefined && 'user' in message) {
    try {
      const userInfo = await client.users.info({ user: message.user });

      await storeUser(message.user, userInfo.user?.name, userInfo.user?.real_name);

      await storeMessageMetadata({
        userId: message.user,
        channelId: message.channel,
        timestamp: message.ts,
        threadTs: message.thread_ts,
        reactionCount: 0
      });

      console.log(`✅ Stored metadata for ${userInfo.user?.name}`);
    } catch (error) {
      console.error('Error storing message:', error);
    }
  }
});

app.error(async (error) => {
  console.error('⚠️ Slack app error:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
});

setInterval(async () => {
  console.log('🔔 Running scheduled manager alerts...');
  await sendManagerAlerts(app);
}, 24 * 60 * 60 * 1000);

(async () => {
  const port = process.env.PORT || 3000;
  await app.start(port);
  console.log(`⚡️ Vibe Check is running on port ${port}`);
})();