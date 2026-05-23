interface MeetingStats {
  totalMeetings: number;
  totalHours: number;
  backToBackCount: number;
  longestStretch: number;
  hasBreaks: boolean;
  overloadScore: number;
}

// Mock calendar data per user
const userCalendarData: Record<string, MeetingStats> = {
  // Sarah (our burnout case) - HEAVY meeting load
  'U_SARAH': {
    totalMeetings: 28,
    totalHours: 32,
    backToBackCount: 12,
    longestStretch: 5.5,
    hasBreaks: false,
    overloadScore: 85
  },
  
  // Emma - High but manageable
  'U_EMMA': {
    totalMeetings: 22,
    totalHours: 24,
    backToBackCount: 6,
    longestStretch: 4,
    hasBreaks: true,
    overloadScore: 55
  },
  
  // Everyone else - Normal
  'DEFAULT': {
    totalMeetings: 12,
    totalHours: 14,
    backToBackCount: 2,
    longestStretch: 2.5,
    hasBreaks: true,
    overloadScore: 20
  }
};

export async function getUserMeetingStats(userId: string): Promise<MeetingStats | null> {
  try {
    // Return user-specific data or default
    return userCalendarData[userId] || userCalendarData['DEFAULT'];
  } catch (error) {
    console.error('Error getting meeting stats:', error);
    return null;
  }
}

export async function getTodayMeetingLoad(userId: string): Promise<MeetingStats | null> {
  return getUserMeetingStats(userId);
}