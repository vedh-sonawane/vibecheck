import { WebClient } from '@slack/web-api';

const client = new WebClient(process.env.SLACK_BOT_TOKEN);

// Search messages in a time range
export async function searchMessages(options: {
  query?: string;
  userId?: string;
  channelId?: string;
  after?: string; // timestamp
  before?: string; // timestamp
  count?: number;
}) {
  try {
    let query = options.query || '*';
    
    if (options.userId) {
      query += ` from:<@${options.userId}>`;
    }
    
    if (options.channelId) {
      query += ` in:<#${options.channelId}>`;
    }
    
    if (options.after) {
      query += ` after:${options.after}`;
    }
    
    if (options.before) {
      query += ` before:${options.before}`;
    }
    
    const result = await client.search.messages({
      query,
      count: options.count || 100,
      sort: 'timestamp',
      sort_dir: 'desc'
    });
    
    return result.messages?.matches || [];
  } catch (error) {
    console.error('RTS search error:', error);
    return [];
  }
}

// Get user's message history for pattern analysis
export async function getUserMessageHistory(userId: string, days: number = 30) {
  const now = Math.floor(Date.now() / 1000);
  const past = now - (days * 24 * 60 * 60);
  
  return await searchMessages({
    userId,
    after: past.toString(),
    count: 1000
  });
}

// Get channel activity
export async function getChannelActivity(channelId: string, days: number = 7) {
  const now = Math.floor(Date.now() / 1000);
  const past = now - (days * 24 * 60 * 60);
  
  return await searchMessages({
    channelId,
    after: past.toString(),
    count: 1000
  });
}