import { analyzeTeamHealth } from './patternAnalyzer';
import { runTeamPredictions } from './prediction';

export async function buildRichTeamDashboard() {
  const teamHealth = await analyzeTeamHealth();
  teamHealth.sort((a, b) => a.healthScore - b.healthScore);
  
  const predictions = await runTeamPredictions();
  
  const avgScore = Math.round(
    teamHealth.reduce((sum, u) => sum + u.healthScore, 0) / teamHealth.length
  );
  
  const critical = teamHealth.filter(u => u.healthScore < 40);
  const atRisk = teamHealth.filter(u => u.healthScore >= 40 && u.healthScore < 60);
  const monitor = teamHealth.filter(u => u.healthScore >= 60 && u.healthScore < 80);
  const healthy = teamHealth.filter(u => u.healthScore >= 80);
  
  const blocks: any[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: '📊 Team Health Dashboard',
        emoji: true
      }
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `_Real-time monitoring · Last updated: <!date^${Math.floor(Date.now() / 1000)}^{date_short_pretty} at {time}|just now>_`
        }
      ]
    },
    {
      type: 'divider'
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Team Overview*`
      }
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Total Members:*\n${teamHealth.length}`
        },
        {
          type: 'mrkdwn',
          text: `*Average Health:*\n${avgScore}/100 ${avgScore >= 70 ? '✅' : avgScore >= 50 ? '⚠️' : '🚨'}`
        },
        {
          type: 'mrkdwn',
          text: `*Healthy:*\n☀️ ${healthy.length} members`
        },
        {
          type: 'mrkdwn',
          text: `*Need Attention:*\n🚨 ${critical.length + atRisk.length} members`
        }
      ]
    }
  ];
  
  // Visual health distribution
  const total = teamHealth.length;
  const healthyPct = Math.round((healthy.length / total) * 100);
  const monitorPct = Math.round((monitor.length / total) * 100);
  const riskPct = Math.round((atRisk.length / total) * 100);
  const criticalPct = Math.round((critical.length / total) * 100);
  
  blocks.push({
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `*Health Distribution:*\n\`\`\`\n☀️ Healthy    │${'█'.repeat(healthyPct / 5)}${'░'.repeat((100 - healthyPct) / 5)}│ ${healthyPct}%\n⛅ Monitor    │${'█'.repeat(monitorPct / 5)}${'░'.repeat((100 - monitorPct) / 5)}│ ${monitorPct}%\n⚠️ At Risk    │${'█'.repeat(riskPct / 5)}${'░'.repeat((100 - riskPct) / 5)}│ ${riskPct}%\n🌧️ Critical   │${'█'.repeat(criticalPct / 5)}${'░'.repeat((100 - criticalPct) / 5)}│ ${criticalPct}%\n\`\`\``
    }
  });
  
  blocks.push({
    type: 'divider'
  });
  
  // Predictions section
  if (predictions.length > 0) {
    blocks.push({
      type: 'header',
      text: {
        type: 'plain_text',
        text: '🔮 Predictive Alerts',
        emoji: true
      }
    });
    
    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: '_AI-powered early warning system based on 30-day behavior patterns_'
        }
      ]
    });
    
    predictions.forEach(pred => {
      const confidencePct = Math.round(pred.confidence * 100);
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*<@${pred.userId}>* · ${pred.predictionType === 'resignation' ? '🚨 High resignation risk' : '⚠️ Burnout risk'}\n*Confidence:* ${confidencePct}% │ *Risk Score:* ${pred.riskScore}/100\n_Indicators: ${pred.basedOn.join(', ')}_`
        },
        accessory: {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'Intervene',
            emoji: true
          },
          style: 'danger',
          value: `intervene_${pred.userId}`,
          action_id: `intervene_${pred.userId}`
        }
      });
    });
    
    blocks.push({
      type: 'divider'
    });
  }
  
  // Critical section
  if (critical.length > 0) {
    blocks.push({
      type: 'header',
      text: {
        type: 'plain_text',
        text: '🚨 Critical Attention Needed',
        emoji: true
      }
    });
    
    critical.forEach(user => {
      const alertTypes = user.alerts.slice(0, 3).map(a => {
        const emoji = a.severity === 'critical' ? '🔴' : a.severity === 'high' ? '🟠' : '🟡';
        return `${emoji} ${a.type.replace(/_/g, ' ')}`;
      }).join('\n');
      
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*<@${user.userId}>* · Health: ${user.healthScore}/100 🌧️\n${alertTypes}`
        },
        accessory: {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'Details',
            emoji: true
          },
          value: user.userId,
          action_id: `details_${user.userId}`
        }
      });
    });
    
    blocks.push({
      type: 'divider'
    });
  }
  
  // At Risk section (collapsed)
  if (atRisk.length > 0) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*⚠️ ${atRisk.length} Members at Risk* · <#details|View all>`
      }
    });
    
    atRisk.slice(0, 3).forEach(user => {
      blocks.push({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `⛅ *${user.username}* · ${user.healthScore}/100 · ${user.alerts[0]?.type.replace(/_/g, ' ') || 'Multiple concerns'}`
          }
        ]
      });
    });
    
    if (atRisk.length > 3) {
      blocks.push({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `_...and ${atRisk.length - 3} more_`
          }
        ]
      });
    }
  }
  
  blocks.push({
    type: 'divider'
  });
  
  blocks.push({
    type: 'actions',
    elements: [
      {
        type: 'button',
        text: {
          type: 'plain_text',
          text: '🔄 Refresh Data',
          emoji: true
        },
        value: 'refresh',
        action_id: 'refresh_dashboard',
        style: 'primary'
      },
      {
        type: 'button',
        text: {
          type: 'plain_text',
          text: '📊 Export Report',
          emoji: true
        },
        value: 'export',
        action_id: 'export_report'
      },
      {
        type: 'button',
        text: {
          type: 'plain_text',
          text: '⚙️ Settings',
          emoji: true
        },
        value: 'settings',
        action_id: 'dashboard_settings'
      }
    ]
  });
  
  return blocks;
}

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