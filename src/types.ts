export interface TimeRange {
  start: string; // Format: "HH:MM"
  end: string;   // Format: "HH:MM"
}

export interface PlayerAvailability {
  name: string;
  isMain: boolean; // true for main roster, false for subs
  available: boolean;
  timeRange: TimeRange | null;
  rawValue: string;
}

export interface CoachAvailability {
  available: boolean;
  timeRange: TimeRange | null;
  rawValue: string;
}

export interface DaySchedule {
  date: string;
  dateFormatted: string;
  mainPlayers: PlayerAvailability[];
  subs: PlayerAvailability[];
  coach: CoachAvailability;
  coachName: string;
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
  unavailableMains: string[];
  requiredSubs: string[];
  commonTimeRange: TimeRange | null;
  canProceed: boolean;
  statusMessage: string;
}

export interface PlayerNames {
  player1: string;
  player2: string;
  player3: string;
  player4: string;
  player5: string;
  sub1: string;
  sub2: string;
  coach: string;
}

export interface SheetData {
  date: string;
  players: {
    player1: string;
    player2: string;
    player3: string;
    player4: string;
    player5: string;
    sub1: string;
    sub2: string;
    coach: string;
  };
  names: PlayerNames;
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
  maps: string[]; // Array of map names
  matchType?: string; // 'Scrim', 'Tournament', 'Premier', etc.
  ourAgents: string[]; // Our team composition (5 agents)
  theirAgents: string[]; // Enemy team composition (5 agents, optional)
  vodUrl: string; // YouTube URL for VOD review
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
