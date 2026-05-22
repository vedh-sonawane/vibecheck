import pool from './client';

// Store user info
export async function storeUser(userId: string, username?: string, realName?: string) {
  const query = `
    INSERT INTO users (user_id, username, real_name)
    VALUES ($1, $2, $3)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      username = COALESCE($2, users.username),
      real_name = COALESCE($3, users.real_name),
      last_seen = NOW()
    RETURNING *;
  `;
  
  try {
    const result = await pool.query(query, [userId, username, realName]);
    return result.rows[0];
  } catch (error) {
    console.error('Error storing user:', error);
    throw error;
  }
}

// Store message metadata (NO CONTENT!)
export async function storeMessageMetadata(data: {
  userId: string;
  channelId: string;
  timestamp: string;
  threadTs?: string;
  reactionCount?: number;
}) {
  const query = `
    INSERT INTO message_metadata 
    (user_id, channel_id, timestamp, message_ts, thread_ts, reaction_count, is_thread_reply)
    VALUES ($1, $2, $3, to_timestamp($4::double precision), $5, $6, $7)
    RETURNING *;
  `;
  
  const messageTs = parseFloat(data.timestamp);
  const isThreadReply = !!data.threadTs;
  
  try {
    const result = await pool.query(query, [
      data.userId,
      data.channelId,
      data.timestamp,
      messageTs,
      data.threadTs || null,
      data.reactionCount || 0,
      isThreadReply
    ]);
    return result.rows[0];
  } catch (error) {
    console.error('Error storing message metadata:', error);
    throw error;
  }
}

// Get user's recent message pattern
export async function getUserRecentPattern(userId: string, days: number = 7) {
  const query = `
    SELECT 
      DATE(message_ts) as date,
      COUNT(*) as message_count,
      COUNT(CASE WHEN EXTRACT(HOUR FROM message_ts) >= 22 OR EXTRACT(HOUR FROM message_ts) <= 6 THEN 1 END) as late_night_count
    FROM message_metadata
    WHERE user_id = $1
      AND message_ts >= NOW() - INTERVAL '${days} days'
    GROUP BY DATE(message_ts)
    ORDER BY date DESC;
  `;
  
  try {
    const result = await pool.query(query, [userId]);
    return result.rows;
  } catch (error) {
    console.error('Error getting user pattern:', error);
    throw error;
  }
}

// Calculate average response time for user
export async function calculateResponseTime(userId: string, days: number = 30) {
  const query = `
    WITH message_pairs AS (
      SELECT 
        m1.user_id,
        m1.message_ts as sent_at,
        MIN(m2.message_ts) as responded_at
      FROM message_metadata m1
      LEFT JOIN message_metadata m2 
        ON m1.channel_id = m2.channel_id 
        AND m1.user_id = m2.user_id
        AND m2.message_ts > m1.message_ts
      WHERE m1.user_id = $1
        AND m1.message_ts >= NOW() - INTERVAL '${days} days'
      GROUP BY m1.user_id, m1.message_ts
    )
    SELECT 
      AVG(EXTRACT(EPOCH FROM (responded_at - sent_at))) as avg_response_seconds
    FROM message_pairs
    WHERE responded_at IS NOT NULL;
  `;
  
  try {
    const result = await pool.query(query, [userId]);
    return result.rows[0]?.avg_response_seconds || null;
  } catch (error) {
    console.error('Error calculating response time:', error);
    throw error;
  }
}

// Store health alert
export async function storeHealthAlert(data: {
  userId: string;
  alertType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}) {
  const query = `
    INSERT INTO health_alerts (user_id, alert_type, severity, description)
    VALUES ($1, $2, $3, $4)
    RETURNING *;
  `;
  
  try {
    const result = await pool.query(query, [
      data.userId,
      data.alertType,
      data.severity,
      data.description
    ]);
    return result.rows[0];
  } catch (error) {
    console.error('Error storing health alert:', error);
    throw error;
  }
}

// Get active alerts for team
export async function getActiveAlerts() {
  const query = `
    SELECT 
      ha.*,
      u.username,
      u.real_name
    FROM health_alerts ha
    JOIN users u ON ha.user_id = u.user_id
    WHERE ha.is_active = true
    ORDER BY ha.detected_at DESC;
  `;
  
  try {
    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    console.error('Error getting active alerts:', error);
    throw error;
  }
}