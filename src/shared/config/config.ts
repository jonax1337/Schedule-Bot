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

// Immutable env values loaded once at startup
const DISCORD_TOKEN = requireEnv('DISCORD_TOKEN');
const DISCORD_GUILD_ID = requireEnv('DISCORD_GUILD_ID');
const ADMIN_USERNAME = requireEnv('ADMIN_USERNAME');

function buildConfig(s: typeof settings) {
  return {
    discord: {
      token: DISCORD_TOKEN,
      channelId: s.discord.channelId,
      guildId: DISCORD_GUILD_ID,
      pingRoleId: s.discord.pingRoleId,
    },
    scheduling: {
      dailyPostTime: s.scheduling.dailyPostTime,
      timezone: s.scheduling.timezone,
      reminderHoursBefore: s.scheduling.reminderHoursBefore,
      duplicateReminderEnabled: s.scheduling.duplicateReminderEnabled,
      duplicateReminderHoursBefore: s.scheduling.duplicateReminderHoursBefore,
      trainingStartPollEnabled: s.scheduling.trainingStartPollEnabled,
    },
    admin: {
      username: ADMIN_USERNAME,
    },
  };
}

export let config = buildConfig(settings);

// Function to reload settings at runtime (atomic swap)
export async function reloadConfig(): Promise<void> {
  settings = await loadSettingsAsync(); // Force reload from PostgreSQL
  config = buildConfig(settings);
  logger.info('Configuration reloaded');
}
