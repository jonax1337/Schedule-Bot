export interface Settings {
  discord: {
    channelId: string;
    pingRoleId: string | null;
    allowDiscordAuth: boolean;
  };
  scheduling: {
    dailyPostTime: string;
    reminderHoursBefore: number;
    duplicateReminderEnabled: boolean;
    duplicateReminderHoursBefore: number;
    trainingStartPollEnabled: boolean;
    pollDurationMinutes: number;
    timezone: string;
    cleanChannelBeforePost: boolean;
    changeNotificationsEnabled: boolean;
  };
  branding: {
    teamName: string;
    tagline?: string;
    logoUrl?: string;
  };
  stratbook: {
    editPermission: 'admin' | 'all';
  };
  admin?: {
    username: string;
    password: string;
  };
}

export interface VodComment {
  id: number;
  scrimId: string;
  userName: string;
  timestamp: number;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActionResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface DiscordMember {
  id: string;
  username: string;
  displayName: string;
  avatar: string | null;
}

export interface ScrimEntry {
  id: string;
  date: string;
  opponent: string;
  result: 'win' | 'loss' | 'draw';
  scoreUs: number;
  scoreThem: number;
  map: string;
  matchType: string;
  ourAgents: string[];
  theirAgents: string[];
  vodUrl: string | null;
  matchLink: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScrimStats {
  totalScrims: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  mapStats: Record<string, { played: number; wins: number; losses: number }>;
}

export interface ScheduleDay {
  date: string;
  reason: string;
  focus: string;
  players: {
    userId: string;
    displayName: string;
    availability: string;
    role: string;
    sortOrder: number;
  }[];
}
