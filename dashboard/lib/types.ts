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
