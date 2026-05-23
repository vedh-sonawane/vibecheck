import { WebClient } from '@slack/web-api';
import { analyzeTeamHealth } from './patternAnalyzer';

const client = new WebClient(process.env.SLACK_BOT_TOKEN);

function getHealthStatus(score: number): string {
  if (score >= 80) return '☀️ Healthy';
  if (score >= 60) return '⛅ Monitor';
  if (score >= 40) return '🌥️ At Risk';
  return '🌧️ Critical';
}

export async function createTeamHealthCanvas(userId?: string): Promise<string> {
  try {
    const teamHealth = await analyzeTeamHealth();

    teamHealth.sort((a, b) => a.healthScore - b.healthScore);

    const avgHealthScore = Math.round(
      teamHealth.reduce((sum, u) => sum + u.healthScore, 0) / (teamHealth.length || 1)
    );

    const criticalCount = teamHealth.filter(u => u.healthScore < 40).length;
    const atRiskCount = teamHealth.filter(u => u.healthScore >= 40 && u.healthScore < 60).length;
    const healthyCount = teamHealth.filter(u => u.healthScore >= 80).length;

    // Build markdown content
    let markdown = `# 📊 Team Health Dashboard\n\n`;
    markdown += `_Last updated: ${new Date().toLocaleString()}_\n\n`;
    markdown += `---\n\n`;
    markdown += `## Overview\n\n`;
    markdown += `| Metric | Value | Status |\n`;
    markdown += `|--------|-------|--------|\n`;
    markdown += `| Team Size | ${teamHealth.length} members | ✓ |\n`;
    markdown += `| Avg Health Score | ${avgHealthScore}/100 | ${getHealthStatus(avgHealthScore)} |\n`;
    markdown += `| Healthy Members | ${healthyCount} | ☀️ |\n`;
    markdown += `| At Risk | ${atRiskCount} | ${atRiskCount > 0 ? '⚠️' : '✓'} |\n`;
    markdown += `| Critical | ${criticalCount} | ${criticalCount > 0 ? '🚨' : '✓'} |\n\n`;
    markdown += `---\n\n`;
    markdown += `## 🚨 Critical Attention Needed\n\n`;

    const criticalUsers = teamHealth.filter(u => u.healthScore < 40);
    if (criticalUsers.length > 0) {
      criticalUsers.forEach(user => {
        const topAlert = user.alerts[0];
        markdown += `> ⚠️ **${user.username}** — Score: ${user.healthScore}/100\n`;
        markdown += `> ${topAlert ? topAlert.description : 'Multiple issues detected'}\n\n`;
      });
    } else {
      markdown += `_No critical issues detected_ ✓\n\n`;
    }

    markdown += `---\n\n`;
    markdown += `## ⚠️ Monitor Closely\n\n`;

    const atRiskUsers = teamHealth.filter(u => u.healthScore >= 40 && u.healthScore < 60);
    if (atRiskUsers.length > 0) {
      markdown += `| Member | Health Score | Primary Concern |\n`;
      markdown += `|--------|-------------|----------------|\n`;
      atRiskUsers.forEach(user => {
        const concern = user.alerts.length > 0 ? user.alerts[0].type.replace(/_/g, ' ') : 'General concern';
        markdown += `| ${user.username || 'Unknown'} | ${user.healthScore}/100 | ${concern} |\n`;
      });
    } else {
      markdown += `_No members at risk_ ✓\n\n`;
    }

    markdown += `\n---\n\n`;
    markdown += `## 📈 Detailed Health Breakdown\n\n`;
    markdown += `| Member | Score | Status | Alerts | Activity |\n`;
    markdown += `|--------|-------|--------|--------|----------|\n`;
    teamHealth.forEach(user => {
      markdown += `| ${user.username || 'Unknown'} | ${user.healthScore}/100 | ${getHealthStatus(user.healthScore)} | ${user.alerts.length} alerts | ${user.messageCount7d} msgs/week |\n`;
    });

    const response = await (client as any).canvases.create({
      title: 'Team Health Dashboard',
      document_content: {
        type: 'markdown',
        markdown
      }
    });

    if (response.canvas_id) {
      console.log('✅ Canvas created:', response.canvas_id);

      if (userId) {
        try {
          await (client as any).canvases.access.set({
            canvas_id: response.canvas_id,
            access_level: 'write',
            user_ids: [userId]
          });
          console.log('✅ Canvas shared with user');
        } catch (e: any) {
          console.log('Canvas access note:', e.message);
        }
      }

      return response.canvas_id;
    }

    throw new Error('Failed to create canvas');

  } catch (error) {
    console.error('Error creating canvas:', error);
    throw error;
  }
}