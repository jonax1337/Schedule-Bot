export interface Settings {
  discord: {
    channelId: string;
    pingRoleId: string | null;
  };
  scheduling: {
    dailyPostTime: string;
    reminderHoursBefore: number;
    trainingStartPollEnabled: boolean;
    timezone: string;
    cleanChannelBeforePost: boolean;
  };
}

export interface ActionResponse {
  success: boolean;
  message?: string;
  error?: string;
}
