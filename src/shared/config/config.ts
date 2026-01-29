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

// Function to reload settings at runtime (mutate in place atomically)
export async function reloadConfig(): Promise<void> {
  const s = await loadSettingsAsync(); // Force reload from PostgreSQL
  settings = s;

  // Update all mutable fields in one batch
  Object.assign(config.discord, {
    channelId: s.discord.channelId,
    pingRoleId: s.discord.pingRoleId,
  });
  Object.assign(config.scheduling, {
    dailyPostTime: s.scheduling.dailyPostTime,
    timezone: s.scheduling.timezone,
    reminderHoursBefore: s.scheduling.reminderHoursBefore,
    duplicateReminderEnabled: s.scheduling.duplicateReminderEnabled,
    duplicateReminderHoursBefore: s.scheduling.duplicateReminderHoursBefore,
    trainingStartPollEnabled: s.scheduling.trainingStartPollEnabled,
  });

  logger.info('Configuration reloaded');
}
