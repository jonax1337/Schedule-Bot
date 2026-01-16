import type {
  SheetData,
  TimeRange,
  PlayerAvailability,
  CoachAvailability,
  DaySchedule,
  ScheduleResult,
  ScheduleStatus,
} from './types.js';

const REQUIRED_PLAYERS = 5;

function parseTimeRange(value: string): TimeRange | null {
  if (!value || value.trim() === '' || value.toLowerCase() === 'x') {
    return null;
  }

  const cleaned = value.trim();

  // Match patterns like "14:00-20:00" or "14:00 - 20:00"
  const rangeMatch = cleaned.match(/^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/);
  if (rangeMatch) {
    return {
      start: normalizeTime(rangeMatch[1]),
      end: normalizeTime(rangeMatch[2]),
    };
  }

  // Match single time like "14:00" (assume available from that time)
  const singleMatch = cleaned.match(/^(\d{1,2}:\d{2})$/);
  if (singleMatch) {
    return {
      start: normalizeTime(singleMatch[1]),
      end: '23:59',
    };
  }

  return null;
}

function normalizeTime(time: string): string {
  const [hours, minutes] = time.split(':');
  return `${hours.padStart(2, '0')}:${minutes}`;
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

function calculateOverlappingTime(ranges: TimeRange[]): TimeRange | null {
  if (ranges.length === 0) return null;

  let latestStart = 0;
  let earliestEnd = 24 * 60; // 23:59 in minutes

  for (const range of ranges) {
    const startMinutes = timeToMinutes(range.start);
    const endMinutes = timeToMinutes(range.end);

    latestStart = Math.max(latestStart, startMinutes);
    earliestEnd = Math.min(earliestEnd, endMinutes);
  }

  if (latestStart >= earliestEnd) {
    return null; // No overlapping time
  }

  return {
    start: minutesToTime(latestStart),
    end: minutesToTime(earliestEnd),
  };
}

function parsePlayerAvailability(
  value: string,
  name: string,
  isMain: boolean
): PlayerAvailability {
  const timeRange = parseTimeRange(value);
  return {
    name,
    isMain,
    available: timeRange !== null,
    timeRange,
    rawValue: value,
  };
}

function parseCoachAvailability(value: string): CoachAvailability {
  const timeRange = parseTimeRange(value);
  return {
    available: timeRange !== null,
    timeRange,
    rawValue: value,
  };
}

export function parseSchedule(data: SheetData): DaySchedule {
  const { players, names } = data;

  const mainPlayers: PlayerAvailability[] = [
    parsePlayerAvailability(players.player1, names.player1, true),
    parsePlayerAvailability(players.player2, names.player2, true),
    parsePlayerAvailability(players.player3, names.player3, true),
    parsePlayerAvailability(players.player4, names.player4, true),
    parsePlayerAvailability(players.player5, names.player5, true),
  ];

  const subs: PlayerAvailability[] = [
    parsePlayerAvailability(players.sub1, names.sub1, false),
    parsePlayerAvailability(players.sub2, names.sub2, false),
  ];

  const coach = parseCoachAvailability(players.coach);

  return {
    date: data.date,
    dateFormatted: data.date,
    mainPlayers,
    subs,
    coach,
    coachName: names.coach,
    reason: data.reason,
    focus: data.focus,
  };
}

export function analyzeSchedule(schedule: DaySchedule): ScheduleResult {
  // Check for Off-Day
  if (schedule.reason.toLowerCase().includes('off-day') ||
      schedule.reason.toLowerCase().includes('off day') ||
      schedule.reason.toLowerCase() === 'off') {
    return {
      schedule,
      status: 'OFF_DAY',
      availableMainCount: 0,
      availableSubCount: 0,
      unavailableMains: [],
      requiredSubs: [],
      commonTimeRange: null,
      canProceed: false,
      statusMessage: 'Off-Day - no practice scheduled.',
    };
  }

  const availableMains = schedule.mainPlayers.filter(p => p.available);
  const unavailableMains = schedule.mainPlayers.filter(p => !p.available);
  const availableSubs = schedule.subs.filter(p => p.available);

  const availableMainCount = availableMains.length;
  const availableSubCount = availableSubs.length;
  const unavailableMainNames = unavailableMains.map(p => p.name);

  let status: ScheduleStatus;
  let canProceed = false;
  let statusMessage: string;
  let requiredSubs: string[] = [];
  let allAvailableRanges: TimeRange[] = [];

  if (availableMainCount >= REQUIRED_PLAYERS) {
    // Full roster available
    status = 'FULL_ROSTER';
    canProceed = true;
    statusMessage = 'Full main roster available!';
    allAvailableRanges = availableMains
      .filter(p => p.timeRange)
      .map(p => p.timeRange!);
  } else {
    const neededSubs = REQUIRED_PLAYERS - availableMainCount;

    if (availableSubCount >= neededSubs) {
      // Can proceed with subs
      status = 'WITH_SUBS';
      canProceed = true;
      requiredSubs = availableSubs.slice(0, neededSubs).map(p => p.name);
      statusMessage = `With subs (${unavailableMainNames.join(', ')} not available)`;

      // Calculate overlapping time with mains + required subs
      const subsToInclude = availableSubs.slice(0, neededSubs);
      allAvailableRanges = [
        ...availableMains.filter(p => p.timeRange).map(p => p.timeRange!),
        ...subsToInclude.filter(p => p.timeRange).map(p => p.timeRange!),
      ];
    } else {
      // Not enough players
      status = 'NOT_ENOUGH';
      canProceed = false;
      const totalAvailable = availableMainCount + availableSubCount;
      statusMessage = `Not enough players (${totalAvailable}/${REQUIRED_PLAYERS})`;
    }
  }

  const commonTimeRange = calculateOverlappingTime(allAvailableRanges);

  return {
    schedule,
    status,
    availableMainCount,
    availableSubCount,
    unavailableMains: unavailableMainNames,
    requiredSubs,
    commonTimeRange,
    canProceed,
    statusMessage,
  };
}

export function getOverlapDuration(range: TimeRange): number {
  const startMinutes = timeToMinutes(range.start);
  const endMinutes = timeToMinutes(range.end);
  return Math.floor((endMinutes - startMinutes) / 60);
}
