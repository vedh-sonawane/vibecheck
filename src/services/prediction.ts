import pool from '../database/client';

interface PredictionResult {
  userId: string;
  riskScore: number; // 0-100
  predictionType: 'resignation' | 'burnout' | 'conflict';
  confidence: number; // 0-1
  basedOn: string[];
}

export async function predictResignationRisk(userId: string): Promise<PredictionResult | null> {
  try {
    // Get historical patterns
    const query = `
      SELECT 
        DATE(message_ts) as date,
        COUNT(*) as messages,
        COUNT(CASE WHEN EXTRACT(HOUR FROM message_ts) >= 22 OR EXTRACT(HOUR FROM message_ts) <= 6 THEN 1 END) as late_night
      FROM message_metadata
      WHERE user_id = $1
        AND message_ts >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(message_ts)
      ORDER BY date DESC;
    `;
    
    const result = await pool.query(query, [userId]);
    const pattern = result.rows;
    
    if (pattern.length < 14) return null; // Not enough data
    
    const recent7 = pattern.slice(0, 7);
    const previous7 = pattern.slice(7, 14);
    
    const recentMessages = recent7.reduce((sum, d) => sum + parseInt(d.messages), 0);
    const prevMessages = previous7.reduce((sum, d) => sum + parseInt(d.messages), 0);
    const recentLateNight = recent7.reduce((sum, d) => sum + parseInt(d.late_night), 0);
    
    // Risk factors
    const factors: string[] = [];
    let riskScore = 0;
    
    // Factor 1: Sudden engagement drop
    if (prevMessages > 0 && recentMessages < prevMessages * 0.3) {
      riskScore += 40;
      factors.push('Severe engagement drop');
    }
    
    // Factor 2: Excessive late-night work
    if (recentLateNight >= 10) {
      riskScore += 30;
      factors.push('Chronic late-night working');
    }
    
    // Factor 3: Complete radio silence
    const silentDays = recent7.filter(d => parseInt(d.messages) === 0).length;
    if (silentDays >= 4) {
      riskScore += 20;
      factors.push('Multiple silent days');
    }
    
    // Factor 4: Declining trend over 4 weeks
    const weeks: number[] = [];
    for (let i = 0; i < 4; i++) {
      const weekData = pattern.slice(i * 7, (i + 1) * 7);
      const weekTotal = weekData.reduce((sum, d) => sum + parseInt(d.messages), 0);
      weeks.push(weekTotal);
    }
    
    const isDecline = weeks.every((val, i) => i === 0 || val < weeks[i - 1]);
    if (isDecline) {
      riskScore += 10;
      factors.push('4-week declining trend');
    }
    
    if (riskScore >= 50) {
      const confidence = Math.min(0.95, riskScore / 100);
      
      return {
        userId,
        riskScore,
        predictionType: 'resignation',
        confidence,
        basedOn: factors
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error predicting resignation risk:', error);
    return null;
  }
}

// Run predictions for entire team
export async function runTeamPredictions() {
  try {
    const query = `
      SELECT DISTINCT user_id
      FROM users
      WHERE last_seen >= NOW() - INTERVAL '7 days';
    `;
    
    const result = await pool.query(query);
    const users = result.rows;
    
    const predictions: PredictionResult[] = [];
    
    for (const user of users) {
      const prediction = await predictResignationRisk(user.user_id);
      if (prediction) {
        predictions.push(prediction);
      }
    }
    
    return predictions;
  } catch (error) {
    console.error('Error running team predictions:', error);
    return [];
  }
}