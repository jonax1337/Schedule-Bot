import { getUsersAbsentOnDate } from './database/absences.js';
import { getUserMappings } from './database/userMappings.js';
import { getScheduleForDate } from './database/schedules.js';
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
    const sheetData = await getScheduleForDate(date);
    if (!sheetData) return null;
    
    const schedule = parseSchedule(sheetData);
    const status = analyzeSchedule(schedule);
    
    // Get absent users for this date
    const absentUserIds = await getUsersAbsentOnDate(date);
    const userMappings = await getUserMappings();
    const absentPlayerNames = absentUserIds
      .map(discordId => userMappings.find(m => m.discordId === discordId)?.sheetColumnName)
      .filter((name): name is string => name !== undefined);
    
    // Extract player lists from schedule
    const availablePlayers = status.schedule.mainPlayers
      .filter(p => p.available)
      .map(p => p.name);
    const unavailablePlayers = status.schedule.mainPlayers
      .filter(p => !p.available && p.rawValue.toLowerCase() === 'x')
      .map(p => p.name);
    const noResponsePlayers = status.schedule.mainPlayers
      .filter(p => !p.available && p.rawValue === '')
      .map(p => p.name);
    
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
  
  // Check cache first
  const now = Date.now();
  const datesToFetch: string[] = [];
  
  for (const date of dates) {
    const cached = cache[date];
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      results[date] = cached;
    } else {
      datesToFetch.push(date);
    }
  }

  // Fetch missing dates
  if (datesToFetch.length > 0) {
    try {
      const userMappings = await getUserMappings();
      
      const fetchPromises = datesToFetch.map(async (date) => {
        try {
          const sheetData = await getScheduleForDate(date);
          if (!sheetData) return;
          
          const schedule = parseSchedule(sheetData);
          const status = analyzeSchedule(schedule);
          
          // Get absent users for this date
          const absentUserIds = await getUsersAbsentOnDate(date);
          const absentPlayerNames = absentUserIds
            .map(discordId => userMappings.find(m => m.discordId === discordId)?.sheetColumnName)
            .filter((name): name is string => name !== undefined);
          
          const availablePlayers = status.schedule.mainPlayers
            .filter(p => p.available)
            .map(p => p.name);
          const unavailablePlayers = status.schedule.mainPlayers
            .filter(p => !p.available && p.rawValue.toLowerCase() === 'x')
            .map(p => p.name);
          const noResponsePlayers = status.schedule.mainPlayers
            .filter(p => !p.available && p.rawValue === '')
            .map(p => p.name);
          
          const details: CachedScheduleDetail = {
            status: status.status,
            startTime: status.commonTimeRange?.start,
            endTime: status.commonTimeRange?.end,
            availablePlayers,
            unavailablePlayers,
            noResponsePlayers,
            absentPlayers: absentPlayerNames,
            timestamp: Date.now(),
          };
          cache[date] = details;
          results[date] = details;
        } catch (error) {
          console.error(`[ScheduleCache] Error fetching ${date}:`, error);
        }
      });

      await Promise.all(fetchPromises);
    } catch (error) {
      console.error('[ScheduleCache] Error in batch fetch:', error);
    }
  }

  return results;
}

/**
 * Invalidate cache for a specific date (call when data changes)
 */
export function invalidateCache(date: string): void {
  delete cache[date];
  console.log(`[ScheduleCache] Cache invalidated for ${date}`);
}

/**
 * Preload cache with upcoming dates from Google Sheets
 */
export async function preloadCache(): Promise<void> {
  if (isPreloading) {
    console.log('[ScheduleCache] Preload already in progress, skipping...');
    return;
  }

  isPreloading = true;
  console.log('[ScheduleCache] Preloading cache...');

  try {
    // Get next 14 dates from PostgreSQL
    const { getNext14Dates } = await import('./database/schedules.js');
    const dates = await getNext14Dates();

    // Preload in batch
    if (dates.length > 0) {
      await getScheduleDetailsBatch(dates);
      console.log(`[ScheduleCache] Preloaded ${dates.length} dates`);
    }
  } catch (error) {
    console.error('[ScheduleCache] Error preloading cache:', error);
  } finally {
    isPreloading = false;
  }
}

/**
 * Clear entire cache
 */
export function clearCache(): void {
  Object.keys(cache).forEach(key => delete cache[key]);
  console.log('[ScheduleCache] Cache cleared');
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: Object.keys(cache).length,
    keys: Object.keys(cache),
  };
}
