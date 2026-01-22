import { getUsersAbsentOnDate } from './database/absences.js';
import { getUserMappings } from './database/userMappings.js';
import { getScheduleForDate, getNext14Dates } from './database/schedules.js';
import { parseSchedule, analyzeSchedule } from './analyzer.js';

interface CachedScheduleDetail {
  status: string;
  startTime?: string;
  endTime?: string;
  availablePlayers: string[];
  unavailablePlayers: string[];
  noResponsePlayers: string[];
  absentPlayers: string[];
  timestamp: number;
}

interface ScheduleCache {
  [date: string]: CachedScheduleDetail;
}

const cache: ScheduleCache = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
let isPreloading = false;

/**
 * Get schedule details from cache or fetch if not available
 */
export async function getScheduleDetails(date: string): Promise<CachedScheduleDetail | null> {
  const cached = cache[date];
  const now = Date.now();

  // Return cached data if still valid
  if (cached && (now - cached.timestamp) < CACHE_DURATION) {
    return cached;
  }

  // Fetch fresh data
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
    
    const details: CachedScheduleDetail = {
      status: status.status,
      startTime: status.commonTimeRange?.start,
      endTime: status.commonTimeRange?.end,
      availablePlayers,
      unavailablePlayers,
      noResponsePlayers,
      absentPlayers: absentPlayerNames,
      timestamp: now,
    };

    cache[date] = details;
    return details;
  } catch (error) {
    console.error(`[ScheduleCache] Error fetching details for ${date}:`, error);
    return null;
  }
}

/**
 * Get multiple schedule details at once (batch operation)
 */
export async function getScheduleDetailsBatch(dates: string[]): Promise<{ [date: string]: CachedScheduleDetail }> {
  const results: { [date: string]: CachedScheduleDetail } = {};
  
  // Fetch all at once
  for (const date of dates) {
    const details = await getScheduleDetails(date);
    if (details) {
      results[date] = details;
    }
  }
  
  return results;
}

/**
 * Invalidate cache for a specific date
 */
export function invalidateCache(date: string): void {
  delete cache[date];
}

/**
 * Invalidate all cache
 */
export function invalidateAllCache(): void {
  Object.keys(cache).forEach(key => delete cache[key]);
}

/**
 * Preload cache for next 14 days
 */
export async function preloadCache(): Promise<void> {
  if (isPreloading) {
    console.log('[ScheduleCache] Already preloading, skipping...');
    return;
  }

  isPreloading = true;
  console.log('[ScheduleCache] Preloading cache...');

  try {
    const dates = getNext14Dates();
    await getScheduleDetailsBatch(dates);
    console.log(`[ScheduleCache] Preloaded ${dates.length} dates`);
  } catch (error) {
    console.error('[ScheduleCache] Error preloading cache:', error);
  } finally {
    isPreloading = false;
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; dates: string[] } {
  const dates = Object.keys(cache);
  return {
    size: dates.length,
    dates: dates.sort(),
  };
}
