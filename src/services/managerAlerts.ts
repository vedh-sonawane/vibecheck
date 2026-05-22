import { analyzeTeamHealth } from './patternAnalyzer';
import { App } from '@slack/bolt';

export async function sendManagerAlerts(app: App) {
  try {
    const teamHealth = await analyzeTeamHealth();
    
    // Find users needing intervention
    const criticalUsers = teamHealth.filter(u => 
      u.healthScore < 50 || 
      u.alerts.some(a => a.severity === 'critical' || a.severity === 'high')
    );
    
    if (criticalUsers.length === 0) {
      console.log('✅ No critical alerts to send');
      return;
    }
    
    // In a real app, you'd get the actual manager's user ID
    // For demo, we'll DM the workspace owner or post to a #management channel
    
    for (const user of criticalUsers) {
      const alertMessage = {
        text: `⚠️ Vibe Check Alert: ${user.username} needs attention`,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: '⚠️ Team Member Health Alert'
            }
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `<@${user.userId}> is showing concerning patterns:\n\n*Health Score:* ${user.healthScore}/100\n*Status:* ${user.healthScore < 40 ? '🌧️ Critical' : '⚠️ At Risk'}`
            }
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Detected Patterns:*\n${user.alerts.map(a => `• ${a.description}`).join('\n')}`
            }
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Suggested Action:*\n• Schedule 1-on-1 check-in\n• Review workload distribution\n• Ensure they're taking breaks`
            }
          }
        ]
      };
      
      // Log for now (in production, send to manager)
      console.log('📨 Would send alert:', alertMessage);
      
      // To actually send:
      // await app.client.chat.postMessage({
      //   channel: 'MANAGER_USER_ID',
      //   ...alertMessage
      // });
    }
    
  } catch (error) {
    console.error('Error sending manager alerts:', error);
  }
}