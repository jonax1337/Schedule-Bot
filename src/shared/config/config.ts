import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { loadSettings, loadSettingsAsync } from '../utils/settingsManager.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from project root (3 levels up from dist/shared/config/)
dotenv.config({ path: resolve(__dirname, '../../../.env') });

// Load persistent settings
let settings = loadSettings();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  discord: {
    token: requireEnv('DISCORD_TOKEN'),
    channelId: settings.discord.channelId,
    guildId: requireEnv('DISCORD_GUILD_ID'),
    pingRoleId: settings.discord.pingRoleId,
  },
  scheduling: {
    dailyPostTime: settings.scheduling.dailyPostTime,
    timezone: settings.scheduling.timezone,
    reminderHoursBefore: settings.scheduling.reminderHoursBefore,
    duplicateReminderEnabled: settings.scheduling.duplicateReminderEnabled,
    duplicateReminderHoursBefore: settings.scheduling.duplicateReminderHoursBefore,
    trainingStartPollEnabled: settings.scheduling.trainingStartPollEnabled,
  },
  admin: {
    username: requireEnv('ADMIN_USERNAME'),
  },
};

// Function to reload settings at runtime
export async function reloadConfig(): Promise<void> {
  settings = await loadSettingsAsync(); // Force reload from PostgreSQL

  // Update config with new settings
  config.discord.channelId = settings.discord.channelId;
  config.discord.pingRoleId = settings.discord.pingRoleId;
  config.scheduling.dailyPostTime = settings.scheduling.dailyPostTime;
  config.scheduling.timezone = settings.scheduling.timezone;
  config.scheduling.reminderHoursBefore = settings.scheduling.reminderHoursBefore;
  config.scheduling.duplicateReminderEnabled = settings.scheduling.duplicateReminderEnabled;
  config.scheduling.duplicateReminderHoursBefore = settings.scheduling.duplicateReminderHoursBefore;
  config.scheduling.trainingStartPollEnabled = settings.scheduling.trainingStartPollEnabled;

  // Admin credentials always come from .env (reload from process.env)
  config.admin.username = process.env.ADMIN_USERNAME || 'admin';

  logger.info('Configuration reloaded');
}
