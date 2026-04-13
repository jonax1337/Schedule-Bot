import type {
  DaySchedule,
  ScheduleResult,
  TimeRange,
  PlayerAvailability,
  ScheduleData
} from '../types/types.js';
import { timeToMinutes, minutesToTime } from './dateFormatter.js';

/**
 * Parse raw schedule data into structured format
 * @param scheduleData - Raw schedule data from the database
 * @param absentUserIds - Optional array of user IDs who are absent on this date
 */
export function parseSchedule(scheduleData: ScheduleData, absentUserIds?: string[]): DaySchedule {
  const [day, month, year] = scheduleData.date.split('.');
  const dateFormatted = `${day}.${month}.${year}`;

  // Parse all players
  const players: PlayerAvailability[] = scheduleData.players.map(p => {
    // Check if user is absent
    if (absentUserIds && absentUserIds.includes(p.userId)) {
      return {
        userId: p.userId,
        displayName: p.displayName,
        role: p.role,
        available: false,
        timeRanges: null,
        rawValue: 'absent',
        sortOrder: p.sortOrder,
        isAbsent: true,
      };
    }

    const availability = p.availability.trim();

    // Parse time ranges (e.g., "14:00-20:00" or "14:00-16:00,17:00-20:00")
    const timeRanges = parseTimeRanges(availability);

    if (timeRanges.length > 0) {
      return {
        userId: p.userId,
        displayName: p.displayName,
        role: p.role,
        available: true,
        timeRanges,
        rawValue: availability,
        sortOrder: p.sortOrder,
      };
    }

    // Not available (x or X)
    if (availability.toLowerCase() === 'x') {
      return {
        userId: p.userId,
        displayName: p.displayName,
        role: p.role,
        available: false,
        timeRanges: null,
        rawValue: availability,
        sortOrder: p.sortOrder,
      };
    }

    // No response (empty)
    return {
      userId: p.userId,
      displayName: p.displayName,
      role: p.role,
      available: false,
      timeRanges: null,
      rawValue: availability,
      sortOrder: p.sortOrder,
    };
  });

  return {
    date: scheduleData.date,
    dateFormatted,
    players,
    reason: scheduleData.reason,
    focus: scheduleData.focus,
  };
}

/**
 * Analyze schedule and determine status
 */
export function analyzeSchedule(schedule: DaySchedule): ScheduleResult {
  // Check for Off-Day
  if (schedule.reason.toLowerCase().includes('off')) {
    return {
      schedule,
      status: 'OFF_DAY',
      availableMainCount: 0,
      availableSubCount: 0,
      availableCoachCount: 0,
      unavailableMains: [],
      requiredSubs: [],
      commonTimeRange: null,
      canProceed: false,
      statusMessage: 'Off-Day',
    };
  }

  // Separate players by role
  const mainPlayers = schedule.players.filter(p => p.role === 'MAIN');
  const subs = schedule.players.filter(p => p.role === 'SUB');
  const coaches = schedule.players.filter(p => p.role === 'COACH');

  // Count available players
  const availableMains = mainPlayers.filter(p => p.available);
  const availableSubs = subs.filter(p => p.available);
  const availableCoaches = coaches.filter(p => p.available);

  const availableMainCount = availableMains.length;
  const availableSubCount = availableSubs.length;
  const availableCoachCount = availableCoaches.length;

  // Find unavailable mains
  const unavailableMains = mainPlayers.filter(p => !p.available);

  // Calculate common time range
  const commonTimeRange = calculateCommonTimeRange([...availableMains, ...availableSubs]);

  // Determine status
  let status: 'FULL_ROSTER' | 'WITH_SUBS' | 'NOT_ENOUGH';
  let canProceed: boolean;
  let statusMessage: string;
  let requiredSubs: PlayerAvailability[] = [];

  if (availableMainCount >= 5) {
    status = 'FULL_ROSTER';
    canProceed = true;
    statusMessage = 'Full roster available';
  } else if (availableMainCount + availableSubCount >= 5) {
    status = 'WITH_SUBS';
    canProceed = true;
    const neededSubs = 5 - availableMainCount;
    requiredSubs = availableSubs.slice(0, neededSubs);
    statusMessage = `With ${neededSubs} sub(s)`;
  } else {
    status = 'NOT_ENOUGH';
    canProceed = false;
    const total = availableMainCount + availableSubCount;
    statusMessage = `Not enough players (${total}/5)`;
  }

  return {
    schedule,
    status,
    availableMainCount,
    availableSubCount,
    availableCoachCount,
    unavailableMains,
    requiredSubs,
    commonTimeRange,
    canProceed,
    statusMessage,
  };
}

/**
 * Parse a comma-separated availability string into an array of TimeRange objects.
 * Handles both single ("14:00-20:00") and multi-window ("14:00-16:00,17:00-20:00") formats.
 */
function parseTimeRanges(availability: string): TimeRange[] {
  const rangePattern = /^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/;
  const segments = availability.split(',').map(s => s.trim());
  const ranges: TimeRange[] = [];

  for (const segment of segments) {
    const match = segment.match(rangePattern);
    if (match) {
      const [, startHour, startMin, endHour, endMin] = match;
      ranges.push({
        start: `${startHour.padStart(2, '0')}:${startMin}`,
        end: `${endHour.padStart(2, '0')}:${endMin}`,
      });
    }
  }

  return ranges;
}

/**
 * Calculate common time range for all available players.
 * Uses a minute-bitmask approach to handle multiple time windows per player.
 * Returns the longest contiguous window where ALL players are simultaneously available.
 */
function calculateCommonTimeRange(players: PlayerAvailability[]): TimeRange | null {
  const availablePlayers = players.filter(p => p.available && p.timeRanges && p.timeRanges.length > 0);

  if (availablePlayers.length === 0) return null;

  // Build available minutes set for each player, then intersect
  let commonMinutes: Set<number> | null = null;

  for (const player of availablePlayers) {
    if (!player.timeRanges) continue;

    const playerMinutes = new Set<number>();
    for (const range of player.timeRanges) {
      const start = timeToMinutes(range.start);
      const end = timeToMinutes(range.end);
      for (let m = start; m < end; m++) {
        playerMinutes.add(m);
      }
    }

    if (commonMinutes === null) {
      commonMinutes = playerMinutes;
    } else {
      // Intersect: keep only minutes present in both sets
      for (const m of commonMinutes) {
        if (!playerMinutes.has(m)) {
          commonMinutes.delete(m);
        }
      }
    }
  }

  if (!commonMinutes || commonMinutes.size === 0) return null;

  // Find the longest contiguous run
  const sorted = [...commonMinutes].sort((a, b) => a - b);
  let bestStart = sorted[0];
  let bestLen = 1;
  let curStart = sorted[0];
  let curLen = 1;

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === sorted[i - 1] + 1) {
      curLen++;
    } else {
      if (curLen > bestLen) {
        bestStart = curStart;
        bestLen = curLen;
      }
      curStart = sorted[i];
      curLen = 1;
    }
  }
  if (curLen > bestLen) {
    bestStart = curStart;
    bestLen = curLen;
  }

  return {
    start: minutesToTime(bestStart),
    end: minutesToTime(bestStart + bestLen),
  };
}

/**
 * Get overlap duration in minutes
 */
export function getOverlapDuration(timeRange: TimeRange | null): number {
  if (!timeRange) return 0;

  const start = timeToMinutes(timeRange.start);
  const end = timeToMinutes(timeRange.end);

  return end - start;
}
