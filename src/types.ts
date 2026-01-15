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

export interface SheetRow {
  date: string;
  player1: string;
  player2: string;
  player3: string;
  player4: string;
  player5: string;
  sub1: string;
  sub2: string;
  coach: string;
  reason: string;
  focus: string;
}
