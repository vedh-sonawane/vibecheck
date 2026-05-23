import { getUserRecentPattern, calculateResponseTime, storeHealthAlert } from '../database/queries';
import pool from '../database/client';
import { getUserMeetingStats } from './mockCalendar';

interface UserHealthMetrics {
  userId: string;
  username?: string;
  messageCount7d: number;
  messageCount30d: number;
  lateNightCount7d: number;
  avgResponseTimeSeconds: number | null;
  currentWeekMessages: number;
  previousWeekMessages: number;
  healthScore: number; // 0-100
  alerts: Alert[];
}

interface Alert {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  metric?: string;
}

// PATTERN 1: Response Time Degradation
async function detectResponseTimeDegradation(userId: string): Promise<Alert | null> {
  try {
    // Get current week vs previous 4 weeks average
    const currentWeek = await calculateResponseTime(userId, 7);
    const baseline = await calculateResponseTime(userId, 30);
    
    if (!currentWeek || !baseline) return null;
    
    const degradationRatio = currentWeek / baseline;
    
    // If response time is 2x slower than baseline
    if (degradationRatio >= 2.0) {
      return {
        type: 'response_time_degradation',
        severity: degradationRatio >= 3.0 ? 'high' : 'medium',
        description: `Response time increased ${Math.round(degradationRatio * 100)}% from baseline`,
        metric: `${Math.round(currentWeek / 60)} min (was ${Math.round(baseline / 60)} min)`
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error detecting response time degradation:', error);
    return null;
  }
}

// PATTERN 2: Engagement Drop
async function detectEngagementDrop(userId: string): Promise<Alert | null> {
  try {
    const pattern = await getUserRecentPattern(userId, 14);
    
    if (pattern.length < 7) return null; // Not enough data
    
    const currentWeek = pattern.slice(0, 7);
    const previousWeek = pattern.slice(7, 14);
    
    const currentTotal = currentWeek.reduce((sum, day) => sum + parseInt(day.message_count), 0);
    const previousTotal = previousWeek.reduce((sum, day) => sum + parseInt(day.message_count), 0);
    
    if (previousTotal === 0) return null;
    
    const dropPercentage = ((previousTotal - currentTotal) / previousTotal) * 100;
    
    // If messages dropped >50%
    if (dropPercentage >= 50) {
      return {
        type: 'engagement_drop',
        severity: dropPercentage >= 75 ? 'high' : 'medium',
        description: `Message activity dropped ${Math.round(dropPercentage)}% this week`,
        metric: `${currentTotal} messages (was ${previousTotal})`
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error detecting engagement drop:', error);
    return null;
  }
}

// PATTERN 3: Late Night Working Pattern
async function detectBurnoutPattern(userId: string): Promise<Alert | null> {
  try {
    const pattern = await getUserRecentPattern(userId, 7);
    
    const lateNightDays = pattern.filter(day => parseInt(day.late_night_count) >= 3).length;
    const totalLateNight = pattern.reduce((sum, day) => sum + parseInt(day.late_night_count), 0);
    
    // If working late 4+ nights in a week
    if (lateNightDays >= 4 || totalLateNight >= 15) {
      return {
        type: 'burnout_pattern',
        severity: lateNightDays >= 6 ? 'critical' : 'high',
        description: `Working late ${lateNightDays} nights this week`,
        metric: `${totalLateNight} late-night messages (10pm-6am)`
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error detecting burnout pattern:', error);
    return null;
  }
}

// PATTERN 4: Silent Tension Detection
async function detectSilentTension(userId: string): Promise<Alert | null> {
  try {
    // Find users this person used to collaborate with but stopped
    const query = `
      WITH recent_collab AS (
        SELECT DISTINCT m2.user_id as collaborator_id
        FROM message_metadata m1
        JOIN message_metadata m2 
          ON m1.channel_id = m2.channel_id
          AND m1.thread_ts = m2.thread_ts
          AND m1.user_id != m2.user_id
        WHERE m1.user_id = $1
          AND m1.message_ts >= NOW() - INTERVAL '7 days'
      ),
      past_collab AS (
        SELECT DISTINCT m2.user_id as collaborator_id
        FROM message_metadata m1
        JOIN message_metadata m2 
          ON m1.channel_id = m2.channel_id
          AND m1.thread_ts = m2.thread_ts
          AND m1.user_id != m2.user_id
        WHERE m1.user_id = $1
          AND m1.message_ts BETWEEN NOW() - INTERVAL '30 days' AND NOW() - INTERVAL '7 days'
      )
      SELECT COUNT(*) as dropped_collabs
      FROM past_collab
      WHERE collaborator_id NOT IN (SELECT collaborator_id FROM recent_collab);
    `;
    
    const result = await pool.query(query, [userId]);
    const droppedCollabs = parseInt(result.rows[0]?.dropped_collabs || '0');
    
    if (droppedCollabs >= 3) {
      return {
        type: 'silent_tension',
        severity: 'medium',
        description: `Stopped collaborating with ${droppedCollabs} people this week`,
        metric: `${droppedCollabs} collaboration gaps detected`
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error detecting silent tension:', error);
    return null;
  }
}

// PATTERN 5: Passive-Aggressive Emoji Detection
async function detectPassiveAggressivePattern(userId: string): Promise<Alert | null> {
  try {
    // Look for 👍 reactions with long delays
    const query = `
      SELECT COUNT(*) as delayed_thumbsup
      FROM reactions r
      JOIN message_metadata m ON r.message_id = m.id
      WHERE r.user_id = $1
        AND r.emoji = 'thumbsup'
        AND r.added_at >= NOW() - INTERVAL '7 days'
        AND EXTRACT(EPOCH FROM (r.added_at - m.message_ts)) > 7200; -- 2+ hours delay
    `;
    
    const result = await pool.query(query, [userId]);
    const delayedThumbsup = parseInt(result.rows[0]?.delayed_thumbsup || '0');
    
    if (delayedThumbsup >= 5) {
      return {
        type: 'passive_aggressive_pattern',
        severity: 'low',
        description: `Frequently using delayed 👍 reactions (possible frustration)`,
        metric: `${delayedThumbsup} delayed acknowledgments`
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error detecting passive-aggressive pattern:', error);
    return null;
  }
}

// PATTERN 6: Meeting Overload Detection (MCP Integration - Mocked)
async function detectMeetingOverload(userId: string): Promise<Alert | null> {
  try {
    const meetingStats = await getUserMeetingStats(userId);
    
    if (!meetingStats) return null;
    
    // Correlate meeting overload with Slack activity
    const pattern = await getUserRecentPattern(userId, 7);
    const messageCount = pattern.reduce((sum, day) => sum + parseInt(day.message_count), 0);
    
    // High meetings + low messages = overwhelmed
    if (meetingStats.overloadScore >= 50) {
      const severity = meetingStats.overloadScore >= 75 ? 'high' : 'medium';
      
      return {
        type: 'meeting_overload',
        severity,
        description: `${meetingStats.totalHours} hours of meetings this week, ${meetingStats.backToBackCount} back-to-back`,
        metric: `Overload score: ${meetingStats.overloadScore}/100`
      };
    }
    
    // Meeting overload causing engagement drop
    if (meetingStats.totalHours > 20 && messageCount < 10) {
      return {
        type: 'meeting_overload',
        severity: 'high',
        description: 'Excessive meetings correlating with low Slack activity',
        metric: `${meetingStats.totalHours}hrs meetings, ${messageCount} messages`
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error detecting meeting overload:', error);
    return null;
  }
}

// Master function: Analyze user health
export async function analyzeUserHealth(userId: string): Promise<UserHealthMetrics> {
  try {
    // Get basic metrics
    const pattern7d = await getUserRecentPattern(userId, 7);
    const pattern30d = await getUserRecentPattern(userId, 30);
    const avgResponseTime = await calculateResponseTime(userId, 30);
    
    const messageCount7d = pattern7d.reduce((sum, day) => sum + parseInt(day.message_count), 0);
    const messageCount30d = pattern30d.reduce((sum, day) => sum + parseInt(day.message_count), 0);
    const lateNightCount7d = pattern7d.reduce((sum, day) => sum + parseInt(day.late_night_count), 0);
    
    const currentWeek = pattern7d.slice(0, 7);
    const previousWeek = pattern30d.slice(7, 14);
    
    const currentWeekMessages = currentWeek.reduce((sum, day) => sum + parseInt(day.message_count), 0);
    const previousWeekMessages = previousWeek.reduce((sum, day) => sum + parseInt(day.message_count), 0);
    
    // Run all pattern detectors
    const alerts: Alert[] = [];
    
    const responseTimeAlert = await detectResponseTimeDegradation(userId);
    if (responseTimeAlert) alerts.push(responseTimeAlert);
    
    const engagementAlert = await detectEngagementDrop(userId);
    if (engagementAlert) alerts.push(engagementAlert);
    
    const burnoutAlert = await detectBurnoutPattern(userId);
    if (burnoutAlert) alerts.push(burnoutAlert);
    
    const tensionAlert = await detectSilentTension(userId);
    if (tensionAlert) alerts.push(tensionAlert);
    
    const paAlert = await detectPassiveAggressivePattern(userId);
    if (paAlert) alerts.push(paAlert);

    const meetingAlert = await detectMeetingOverload(userId);
    if (meetingAlert) alerts.push(meetingAlert);
    
    // Calculate health score (0-100)
    let healthScore = 100;
    
    alerts.forEach(alert => {
      if (alert.severity === 'critical') healthScore -= 30;
      else if (alert.severity === 'high') healthScore -= 20;
      else if (alert.severity === 'medium') healthScore -= 10;
      else if (alert.severity === 'low') healthScore -= 5;
    });
    
    healthScore = Math.max(0, healthScore);
    
    // Store critical alerts in database
    for (const alert of alerts) {
      if (alert.severity === 'high' || alert.severity === 'critical') {
        await storeHealthAlert({
          userId,
          alertType: alert.type,
          severity: alert.severity,
          description: alert.description
        });
      }
    }
    
    return {
      userId,
      messageCount7d,
      messageCount30d,
      lateNightCount7d,
      avgResponseTimeSeconds: avgResponseTime,
      currentWeekMessages,
      previousWeekMessages,
      healthScore,
      alerts
    };
  } catch (error) {
    console.error('Error analyzing user health:', error);
    throw error;
  }
}

// Analyze entire team
export async function analyzeTeamHealth(): Promise<UserHealthMetrics[]> {
  try {
    // Get all active users
    const query = `
      SELECT DISTINCT user_id, username, last_seen
      FROM users
      WHERE last_seen >= NOW() - INTERVAL '7 days'
      ORDER BY last_seen DESC;
    `;
    
    const result = await pool.query(query);
    const users = result.rows;
    
    const teamHealth: UserHealthMetrics[] = [];
    
    for (const user of users) {
      const health = await analyzeUserHealth(user.user_id);
      health.username = user.username;
      teamHealth.push(health);
    }
    
    return teamHealth;
  } catch (error) {
    console.error('Error analyzing team health:', error);
    return [];
  }
}