import { google } from 'googleapis';
import { authenticate } from '@google-cloud/local-auth';
import * as fs from 'fs';
import * as path from 'path';

const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];
const TOKEN_PATH = path.join(process.cwd(), 'google-token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'google-credentials.json');

interface CalendarEvent {
  summary: string;
  start: string;
  end: string;
  duration: number; // minutes
  attendees?: number;
}

interface MeetingStats {
  totalMeetings: number;
  totalHours: number;
  backToBackCount: number;
  longestStretch: number; // hours
  hasBreaks: boolean;
  overloadScore: number; // 0-100
}

// Load saved credentials
async function loadSavedCredentials() {
  try {
    const content = await fs.promises.readFile(TOKEN_PATH, 'utf-8');
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

// Save credentials
async function saveCredentials(client: any) {
  const content = await fs.promises.readFile(CREDENTIALS_PATH, 'utf-8');
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.promises.writeFile(TOKEN_PATH, payload);
}

//Authorize with Google
async function authorize(): Promise<any> {
  let client: any = await loadSavedCredentials();
  if (client) {
    return client;
  }
  
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  
  if (client && client.credentials) {
    await saveCredentials(client);
  }
  
  return client;
}

// Get calendar events for a date range
async function getCalendarEvents(
  auth: any,
  startDate: Date,
  endDate: Date
): Promise<CalendarEvent[]> {
  const calendar = google.calendar({ version: 'v3', auth });
  
  try {
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });
    
    const events = response.data.items || [];
    
    return (events as any[]).filter(event => event.start && event.end).map(event => {
      const start = new Date(event.start?.dateTime || event.start?.date || '');
      const end = new Date(event.end?.dateTime || event.end?.date || '');
      const duration = (end.getTime() - start.getTime()) / (1000 * 60); // minutes
      
      return {
        summary: event.summary || 'No title',
        start: start.toISOString(),
        end: end.toISOString(),
        duration,
        attendees: event.attendees?.length || 0,
      };
    });
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    return [];
  }
}

// Analyze meeting patterns
function analyzeMeetingPattern(events: CalendarEvent[]): MeetingStats {
  if (events.length === 0) {
    return {
      totalMeetings: 0,
      totalHours: 0,
      backToBackCount: 0,
      longestStretch: 0,
      hasBreaks: true,
      overloadScore: 0,
    };
  }
  
  let totalHours = 0;
  let backToBackCount = 0;
  let currentStretch = 0;
  let longestStretch = 0;
  let hasBreaks = false;
  
  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    totalHours += event.duration / 60;
    
    if (i > 0) {
      const prevEnd = new Date(events[i - 1].end);
      const currentStart = new Date(event.start);
      const gap = (currentStart.getTime() - prevEnd.getTime()) / (1000 * 60); // minutes
      
      if (gap <= 5) {
        // Back-to-back meeting
        backToBackCount++;
        currentStretch += event.duration / 60;
      } else {
        // Break detected
        hasBreaks = true;
        longestStretch = Math.max(longestStretch, currentStretch);
        currentStretch = event.duration / 60;
      }
    } else {
      currentStretch = event.duration / 60;
    }
  }
  
  longestStretch = Math.max(longestStretch, currentStretch);
  
  // Calculate overload score (0-100)
  let overloadScore = 0;
  
  if (totalHours > 6) overloadScore += 30; // 6+ hours of meetings
  if (backToBackCount > 3) overloadScore += 25; // 3+ back-to-back meetings
  if (longestStretch > 4) overloadScore += 25; // 4+ hour stretch
  if (!hasBreaks) overloadScore += 20; // No breaks at all
  
  overloadScore = Math.min(100, overloadScore);
  
  return {
    totalMeetings: events.length,
    totalHours: Math.round(totalHours * 10) / 10,
    backToBackCount,
    longestStretch: Math.round(longestStretch * 10) / 10,
    hasBreaks,
    overloadScore,
  };
}

// Main export: Get meeting stats for past week
export async function getUserMeetingStats(): Promise<MeetingStats | null> {
  try {
    const auth = await authorize();
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7); // Last 7 days
    
    const events = await getCalendarEvents(auth, startDate, endDate);
    const stats = analyzeMeetingPattern(events);
    
    return stats;
  } catch (error) {
    console.error('Error getting meeting stats:', error);
    return null;
  }
}

// Get today's meeting load
export async function getTodayMeetingLoad(): Promise<MeetingStats | null> {
  try {
    const auth = await authorize();
    
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    
    const events = await getCalendarEvents(auth, startDate, endDate);
    const stats = analyzeMeetingPattern(events);
    
    return stats;
  } catch (error) {
    console.error('Error getting today meeting load:', error);
    return null;
  }
}
