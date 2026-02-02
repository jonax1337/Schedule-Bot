import { getUserMappings } from '../../repositories/user-mapping.repository.js';
import { getScheduleForDate } from '../../repositories/schedule.repository.js';
import { getAbsentUserIdsForDate } from '../../repositories/absence.repository.js';
import { parseSchedule, analyzeSchedule } from './analyzer.js';
import { logger, getErrorMessage } from './logger.js';
import type { ScheduleResult } from '../types/types.js';

/**
 * Fetch schedule for a date, apply absences, parse, and analyze in one call.
 * Returns the full ScheduleResult or null if no schedule exists.
 */
export async function getAnalyzedSchedule(date: string): Promise<ScheduleResult | null> {
  const scheduleData = await getScheduleForDate(date);
  if (!scheduleData) return null;
  const absentUserIds = await getAbsentUserIdsForDate(date);
  const parsed = parseSchedule(scheduleData, absentUserIds);
  return analyzeSchedule(parsed);
}

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
    const status = await getAnalyzedSchedule(date);
    if (!status) return null;

    // Extract player lists from schedule - filter by role
    const mainPlayers = status.schedule.players.filter(p => p.role === 'MAIN');
    const availablePlayers = mainPlayers
      .filter(p => p.available)
      .map(p => p.displayName);
    const unavailablePlayers = mainPlayers
      .filter(p => !p.available && !p.isAbsent && p.rawValue.toLowerCase() === 'x')
      .map(p => p.displayName);
    const noResponsePlayers = mainPlayers
      .filter(p => !p.available && !p.isAbsent && p.rawValue === '')
      .map(p => p.displayName);
    const absentPlayers = status.schedule.players
      .filter(p => p.isAbsent)
      .map(p => p.displayName);

    // Check if no one has set their availability yet (excluding absent players)
    const nonAbsentMains = mainPlayers.filter(p => !p.isAbsent);
    const allPlayersNoResponse = nonAbsentMains.length > 0 && nonAbsentMains.every(p => !p.available && p.rawValue === '');

    // Convert backend status to frontend-friendly string
    let statusString = 'Unknown';

    if (allPlayersNoResponse) {
      // If no one has set availability yet, show "Unknown"
      statusString = 'Unknown';
    } else if (status.status === 'OFF_DAY') {
      statusString = 'Off-Day';
    } else if (status.status === 'FULL_ROSTER') {
      statusString = 'Able to play';
    } else if (status.status === 'WITH_SUBS') {
      // If we have 5+ players (Main + Sub, without Coach), training is possible
      const totalAvailable = status.availableMainCount + status.availableSubCount;
      if (totalAvailable >= 5) {
        statusString = 'Able to play';
      } else if (totalAvailable === 4) {
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
      absentPlayers,
    };
  } catch (error) {
    logger.error(`[ScheduleDetails] Error fetching details for ${date}`, getErrorMessage(error));
    return null;
  }
}

/**
 * Get schedule details for multiple dates at once (batch operation)
 */
export async function getScheduleDetailsBatch(dates: string[]): Promise<{ [date: string]: ScheduleDetail }> {
  const results: { [date: string]: ScheduleDetail } = {};
  const details = await Promise.all(dates.map(date => getScheduleDetails(date)));
  dates.forEach((date, i) => {
    if (details[i]) results[date] = details[i];
  });
  return results;
}
