import { getScheduleStatus } from './analyzer.js';
import { getAuthenticatedClient } from './sheetUpdater.js';
import { config, SHEET_COLUMNS } from './config.js';

interface CachedScheduleDetail {
  status: string;
  startTime?: string;
  endTime?: string;
  availablePlayers: string[];
  unavailablePlayers: string[];
  noResponsePlayers: string[];
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
    const sheets = await getAuthenticatedClient();
    const status = await getScheduleStatus(date, sheets);
    
    const details: CachedScheduleDetail = {
      status: status.status,
      startTime: status.startTime,
      endTime: status.endTime,
      availablePlayers: status.availablePlayers || [],
      unavailablePlayers: status.unavailablePlayers || [],
      noResponsePlayers: status.noResponsePlayers || [],
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
      const sheets = await getAuthenticatedClient();
      
      // Fetch all dates in parallel
      const fetchPromises = datesToFetch.map(async (date) => {
        try {
          const status = await getScheduleStatus(date, sheets);
          const details: CachedScheduleDetail = {
            status: status.status,
            startTime: status.startTime,
            endTime: status.endTime,
            availablePlayers: status.availablePlayers || [],
            unavailablePlayers: status.unavailablePlayers || [],
            noResponsePlayers: status.noResponsePlayers || [],
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
    const sheets = await getAuthenticatedClient();
    
    // Fetch sheet data
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: config.googleSheets.sheetId,
      range: 'A:K',
    });

    const rows = response.data.values;
    if (!rows || rows.length < 2) {
      console.log('[ScheduleCache] No data to preload');
      isPreloading = false;
      return;
    }

    // Get dates from next 14 rows (skip header)
    const dates: string[] = [];
    for (let i = 1; i < Math.min(rows.length, 15); i++) {
      const row = rows[i];
      if (row && row[0]) {
        dates.push(row[0].trim());
      }
    }

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
