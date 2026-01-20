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

/**
 * Get detailed schedule status for a specific date from Google Sheets
 * Used for change notifications and dashboard details
 */
export async function getScheduleStatus(date: string, sheetsApi: any): Promise<{
  status: string;
  startTime?: string;
  endTime?: string;
  availablePlayers?: string[];
  unavailablePlayers?: string[];
  noResponsePlayers?: string[];
}> {
  try {
    const { config } = await import('./config.js');
    
    // Fetch sheet data
    const response = await sheetsApi.spreadsheets.values.get({
      spreadsheetId: config.googleSheets.sheetId,
      range: 'A:K',
    });

    const rows = response.data.values;
    if (!rows || rows.length < 2) {
      return { status: 'Unknown' };
    }

    // Find the row for the specified date
    const normalizedDate = date.trim();
    const dataRow = rows.slice(1).find((row: any) => {
      const rowDate = (row[0] || '').trim();
      return rowDate === normalizedDate;
    });

    if (!dataRow) {
      return { status: 'Unknown' };
    }

    // Get header row to map columns
    const headerRow = rows[0];
    
    // Parse player data
    const sheetData: SheetData = {
      date: dataRow[0],
      players: {
        player1: dataRow[1] || '',
        player2: dataRow[2] || '',
        player3: dataRow[3] || '',
        player4: dataRow[4] || '',
        player5: dataRow[5] || '',
        sub1: dataRow[6] || '',
        sub2: dataRow[7] || '',
        coach: dataRow[8] || '',
      },
      names: {
        player1: headerRow[1] || 'Player 1',
        player2: headerRow[2] || 'Player 2',
        player3: headerRow[3] || 'Player 3',
        player4: headerRow[4] || 'Player 4',
        player5: headerRow[5] || 'Player 5',
        sub1: headerRow[6] || 'Sub 1',
        sub2: headerRow[7] || 'Sub 2',
        coach: headerRow[8] || 'Coach',
      },
      reason: dataRow[9] || '',
      focus: dataRow[10] || '',
    };

    const schedule = parseSchedule(sheetData);
    const result = analyzeSchedule(schedule);

    // Check if all players have not responded (no time set, not unavailable)
    const allPlayersNoResponse = schedule.mainPlayers.every(p => !p.available && p.rawValue !== 'x' && p.rawValue.toLowerCase() !== 'x') &&
                                  schedule.subs.every(p => !p.available && p.rawValue !== 'x' && p.rawValue.toLowerCase() !== 'x');

    // If nobody has set anything yet, return Unknown
    if (allPlayersNoResponse) {
      const noResponsePlayers: string[] = [];
      schedule.mainPlayers.forEach(p => noResponsePlayers.push(p.name));
      schedule.subs.forEach(p => noResponsePlayers.push(p.name));
      
      return {
        status: 'Unknown',
        availablePlayers: [],
        unavailablePlayers: [],
        noResponsePlayers,
      };
    }

    // Map status to human-readable format
    let statusText = 'Unknown';
    if (result.status === 'OFF_DAY') {
      statusText = 'Off-Day';
    } else if (result.status === 'FULL_ROSTER') {
      statusText = 'Training possible';
    } else if (result.status === 'WITH_SUBS') {
      statusText = 'Training possible';
    } else if (result.status === 'NOT_ENOUGH') {
      if (result.availableMainCount + result.availableSubCount >= 4) {
        statusText = 'Almost there';
      } else if (result.availableMainCount + result.availableSubCount >= 2) {
        statusText = 'More players needed';
      } else {
        statusText = 'Insufficient players';
      }
    }

    // Collect player lists
    const availablePlayers: string[] = [];
    const unavailablePlayers: string[] = [];
    const noResponsePlayers: string[] = [];

    schedule.mainPlayers.forEach(p => {
      if (p.available && p.timeRange) {
        availablePlayers.push(`${p.name} (${p.timeRange.start}-${p.timeRange.end})`);
      } else if (p.rawValue === 'x' || p.rawValue.toLowerCase() === 'x') {
        unavailablePlayers.push(p.name);
      } else {
        noResponsePlayers.push(p.name);
      }
    });

    schedule.subs.forEach(p => {
      if (p.available && p.timeRange) {
        availablePlayers.push(`${p.name} (${p.timeRange.start}-${p.timeRange.end})`);
      } else if (p.rawValue === 'x' || p.rawValue.toLowerCase() === 'x') {
        unavailablePlayers.push(p.name);
      } else {
        noResponsePlayers.push(p.name);
      }
    });

    return {
      status: statusText,
      startTime: result.commonTimeRange?.start,
      endTime: result.commonTimeRange?.end,
      availablePlayers,
      unavailablePlayers,
      noResponsePlayers,
    };
  } catch (error) {
    console.error('[Analyzer] Error getting schedule status:', error);
    return { status: 'Unknown' };
  }
}
