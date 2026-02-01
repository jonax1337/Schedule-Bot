export interface TimeRange {
  start: string; // Format: "HH:MM"
  end: string;   // Format: "HH:MM"
}

export interface PlayerAvailability {
  userId: string; // Discord ID
  displayName: string;
  role: 'MAIN' | 'SUB' | 'COACH';
  available: boolean;
  timeRange: TimeRange | null;
  rawValue: string;
  sortOrder: number;
  isAbsent?: boolean; // true if user has an active absence for this date
}

export interface DaySchedule {
  date: string;
  dateFormatted: string;
  players: PlayerAvailability[]; // All players (main, subs, coaches)
  reason: string;
  focus: string;
}

export type ScheduleStatus =
  | 'OFF_DAY'
  | 'FULL_ROSTER'
  | 'WITH_SUBS'
  | 'NOT_ENOUGH';

export interface ScheduleResult {
  schedule: DaySchedule;
  status: ScheduleStatus;
  availableMainCount: number;
  availableSubCount: number;
  availableCoachCount: number;
  unavailableMains: PlayerAvailability[];
  requiredSubs: PlayerAvailability[];
  commonTimeRange: TimeRange | null;
  canProceed: boolean;
  statusMessage: string;
}

export type ScheduleAnalysisResult = ScheduleResult;

export interface SchedulePlayerData {
  userId: string;
  displayName: string;
  role: 'MAIN' | 'SUB' | 'COACH';
  availability: string;
  sortOrder: number;
}

export interface ScheduleData {
  date: string;
  players: SchedulePlayerData[];
  reason: string;
  focus: string;
}

// Match Tracking Types
export interface ScrimEntry {
  id: string;
  date: string; // Format: DD.MM.YYYY
  opponent: string;
  result: 'win' | 'loss' | 'draw';
  scoreUs: number;
  scoreThem: number;
  map: string; // Map name
  matchType?: string; // 'Scrim', 'Tournament', 'Premier', etc.
  ourAgents: string[]; // Our team composition (5 agents)
  theirAgents: string[]; // Enemy team composition (5 agents, optional)
  vodUrl: string; // YouTube URL for VOD review
  matchLink: string; // External match link
  notes: string;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

export interface ScrimStats {
  totalScrims: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  mapStats: {
    [mapName: string]: {
      played: number;
      wins: number;
      losses: number;
    };
  };
}
