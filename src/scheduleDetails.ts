import { getUsersAbsentOnDate } from './database/absences.js';
import { getUserMappings } from './database/userMappings.js';
import { getScheduleForDate } from './database/schedules.js';
import { parseSchedule, analyzeSchedule } from './analyzer.js';

export interface ScheduleDetail {
  status: string;
  startTime?: string;
  endTime?: string;
  availablePlayers: string[];
  unavailablePlayers: string[];
  noResponsePlayers: string[];
  absentPlayers: string[];
}

/**
 * Get schedule details for a specific date (no caching, direct DB query)
 */
export async function getScheduleDetails(date: string): Promise<ScheduleDetail | null> {
  try {
    const scheduleData = await getScheduleForDate(date);
    if (!scheduleData) return null;
    
    const schedule = parseSchedule(scheduleData);
    const status = analyzeSchedule(schedule);
    
    // Get absent users for this date
    const absentUserIds = await getUsersAbsentOnDate(date);
    const userMappings = await getUserMappings();
    const absentPlayerNames = absentUserIds
      .map(discordId => userMappings.find(m => m.discordId === discordId)?.displayName)
      .filter((name): name is string => name !== undefined);
    
    // Extract player lists from schedule - filter by role
    const mainPlayers = status.schedule.players.filter(p => p.role === 'MAIN');
    const availablePlayers = mainPlayers
      .filter(p => p.available)
      .map(p => p.displayName);
    const unavailablePlayers = mainPlayers
      .filter(p => !p.available && p.rawValue.toLowerCase() === 'x')
      .map(p => p.displayName);
    const noResponsePlayers = mainPlayers
      .filter(p => !p.available && p.rawValue === '')
      .map(p => p.displayName);
    
    // Check if no one has set their availability yet
    const allPlayersNoResponse = mainPlayers.every(p => !p.available && p.rawValue === '');
    
    // Convert backend status to frontend-friendly string
    let statusString = 'Unknown';
    
    if (allPlayersNoResponse) {
      // If no one has set availability yet, show "Unknown"
      statusString = 'Unknown';
    } else if (status.status === 'OFF_DAY') {
      statusString = 'Off-Day';
    } else if (status.status === 'FULL_ROSTER') {
      statusString = 'Training possible';
    } else if (status.status === 'WITH_SUBS') {
      // Determine if "Almost there" or "More players needed"
      const totalAvailable = status.availableMainCount + status.availableSubCount;
      if (totalAvailable >= 5) {
        statusString = 'Almost there';
      } else {
        statusString = 'More players needed';
      }
    } else if (status.status === 'NOT_ENOUGH') {
      statusString = 'Insufficient players';
    }
    
    return {
      status: statusString,
      startTime: status.commonTimeRange?.start,
      endTime: status.commonTimeRange?.end,
      availablePlayers,
      unavailablePlayers,
      noResponsePlayers,
      absentPlayers: absentPlayerNames,
    };
  } catch (error) {
    console.error(`[ScheduleDetails] Error fetching details for ${date}:`, error);
    return null;
  }
}

/**
 * Get schedule details for multiple dates at once (batch operation)
 */
export async function getScheduleDetailsBatch(dates: string[]): Promise<{ [date: string]: ScheduleDetail }> {
  const results: { [date: string]: ScheduleDetail } = {};
  
  // Fetch all at once
  for (const date of dates) {
    const details = await getScheduleDetails(date);
    if (details) {
      results[date] = details;
    }
  }
  
  return results;
}
