import { analyzeUserHealth, analyzeTeamHealth } from './patternAnalyzer';
import { runTeamPredictions } from './prediction';

function getHealthEmoji(score: number): string {
  if (score >= 80) return '☀️';
  if (score >= 60) return '⛅';
  if (score >= 40) return '🌥️';
  if (score >= 20) return '⚠️';
  return '🌧️';
}

function getSeverityEmoji(severity: string): string {
  switch (severity) {
    case 'critical': return '🔴';
    case 'high': return '🟠';
    case 'medium': return '🟡';
    case 'low': return '🟢';
    default: return '⚪';
  }
}

export function buildUserHealthReport(metrics: any) {
  const emoji = getHealthEmoji(metrics.healthScore);
  const status = metrics.healthScore >= 80 ? 'Healthy' :
                 metrics.healthScore >= 60 ? 'Monitor' :
                 metrics.healthScore >= 40 ? 'At Risk' : 'Critical';

  let blocks: any[] = [
    {
      type: 'header',
      text: { type: 'plain_text', text: `${emoji} Health Status: ${status}` }
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Health Score:*\n${metrics.healthScore}/100` },
        { type: 'mrkdwn', text: `*Activity (7d):*\n${metrics.messageCount7d} messages` },
        { type: 'mrkdwn', text: `*Late Nights:*\n${metrics.lateNightCount7d} occurrences` },
        {
          type: 'mrkdwn',
          text: `*Trend:*\n${metrics.currentWeekMessages > metrics.previousWeekMessages ? '📈' : '📉'} ${Math.abs(metrics.currentWeekMessages - metrics.previousWeekMessages)} vs last week`
        }
      ]
    }
  ];

  if (metrics.alerts && metrics.alerts.length > 0) {
    blocks.push({ type: 'divider' });
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `*⚠️ Active Alerts (${metrics.alerts.length}):*` }
    });

    metrics.alerts.forEach((alert: any) => {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${getSeverityEmoji(alert.severity)} *${alert.type.replace(/_/g, ' ').toUpperCase()}*\n${alert.description}\n_${alert.metric || ''}_`
        }
      });
    });
  }

  return blocks;
}

export async function buildTeamDashboard() {
  const teamHealth = await analyzeTeamHealth();

  teamHealth.sort((a, b) => a.healthScore - b.healthScore);

  const criticalUsers = teamHealth.filter(u => u.healthScore < 40);
  const atRiskUsers = teamHealth.filter(u => u.healthScore >= 40 && u.healthScore < 60);
  const healthyUsers = teamHealth.filter(u => u.healthScore >= 80);

  let blocks: any[] = [
    {
      type: 'header',
      text: { type: 'plain_text', text: '📊 Team Health Dashboard' }
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Total Members:*\n${teamHealth.length}` },
        { type: 'mrkdwn', text: `*Healthy:*\n☀️ ${healthyUsers.length}` },
        { type: 'mrkdwn', text: `*At Risk:*\n⚠️ ${atRiskUsers.length}` },
        { type: 'mrkdwn', text: `*Critical:*\n🌧️ ${criticalUsers.length}` }
      ]
    }
  ];

  if (criticalUsers.length > 0) {
    blocks.push({ type: 'divider' });
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: '*🚨 Critical Attention Needed:*' }
    });

    criticalUsers.forEach(user => {
      const alertSummary = user.alerts.map((a: any) => a.type.split('_')[0]).join(', ');
      blocks.push({
        type: 'section',
        text: { type: 'mrkdwn', text: `🌧️ <@${user.userId}> - Score: ${user.healthScore}/100\n_${alertSummary}_` }
      });
    });
  }

  if (atRiskUsers.length > 0) {
    blocks.push({ type: 'divider' });
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: '*⚠️ Monitor Closely:*' }
    });

    atRiskUsers.slice(0, 5).forEach(user => {
      blocks.push({
        type: 'section',
        text: { type: 'mrkdwn', text: `⛅ <@${user.userId}> - Score: ${user.healthScore}/100` }
      });
    });
  }

  // Predictions section
  const predictions = await runTeamPredictions();

  if (predictions.length > 0) {
    blocks.push({ type: 'divider' });
    blocks.push({
      type: 'header',
      text: { type: 'plain_text', text: '🔮 Predictive Alerts', emoji: true }
    });

    predictions.forEach((pred: any) => {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*<@${pred.userId}>* - ${Math.round(pred.confidence * 100)}% confidence\n_${pred.basedOn.join(', ')}_`
        }
      });
    });
  }

  return blocks;
}