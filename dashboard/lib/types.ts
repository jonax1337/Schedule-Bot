export interface Settings {
  discord: {
    channelId: string;
    pingRoleId: string | null;
    allowDiscordAuth: boolean;
  };
  scheduling: {
    dailyPostTime: string;
    reminderHoursBefore: number;
    trainingStartPollEnabled: boolean;
    pollDurationMinutes: number;
    timezone: string;
    cleanChannelBeforePost: boolean;
  };
  branding: {
    teamName: string;
  };
  admin?: {
    username: string;
    password: string;
  };
}

export interface ActionResponse {
  success: boolean;
  message?: string;
  error?: string;
}
