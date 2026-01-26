import type { 
  DaySchedule, 
  ScheduleResult, 
  TimeRange, 
  PlayerAvailability,
  ScheduleData 
} from '../types/types.js';

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
        timeRange: null,
        rawValue: 'absent',
        sortOrder: p.sortOrder,
        isAbsent: true,
      };
    }

    const availability = p.availability.trim();

    // Parse time range (e.g., "14:00-20:00")
    const timeMatch = availability.match(/^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/);

    if (timeMatch) {
      const [, startHour, startMin, endHour, endMin] = timeMatch;
      return {
        userId: p.userId,
        displayName: p.displayName,
        role: p.role,
        available: true,
        timeRange: {
          start: `${startHour.padStart(2, '0')}:${startMin}`,
          end: `${endHour.padStart(2, '0')}:${endMin}`,
        },
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
        timeRange: null,
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
      timeRange: null,
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
 * Calculate common time range for all available players
 */
function calculateCommonTimeRange(players: PlayerAvailability[]): TimeRange | null {
  const availablePlayers = players.filter(p => p.available && p.timeRange);
  
  if (availablePlayers.length === 0) return null;

  // Convert times to minutes for easier comparison
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const minutesToTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  };

  // Find latest start time and earliest end time
  let latestStart = 0;
  let earliestEnd = 24 * 60; // 24:00 in minutes

  for (const player of availablePlayers) {
    if (!player.timeRange) continue;
    
    const start = timeToMinutes(player.timeRange.start);
    const end = timeToMinutes(player.timeRange.end);

    if (start > latestStart) latestStart = start;
    if (end < earliestEnd) earliestEnd = end;
  }

  // If no overlap, return null
  if (latestStart >= earliestEnd) return null;

  return {
    start: minutesToTime(latestStart),
    end: minutesToTime(earliestEnd),
  };
}

/**
 * Get overlap duration in minutes
 */
export function getOverlapDuration(timeRange: TimeRange | null): number {
  if (!timeRange) return 0;

  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const start = timeToMinutes(timeRange.start);
  const end = timeToMinutes(timeRange.end);

  return end - start;
}
