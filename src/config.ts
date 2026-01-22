import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { loadSettings, reloadSettings, loadSettingsAsync } from './settingsManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env') });

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
  config.scheduling.trainingStartPollEnabled = settings.scheduling.trainingStartPollEnabled;
  
  // Admin credentials always come from .env (reload from process.env)
  config.admin.username = process.env.ADMIN_USERNAME || 'admin';
  
  console.log('Configuration reloaded from PostgreSQL and .env');
  console.log('New pingRoleId:', config.discord.pingRoleId);
  console.log('New channelId:', config.discord.channelId);
  console.log('New dailyPostTime:', config.scheduling.dailyPostTime);
}

// Column name mappings (used for user mapping compatibility)
export const SHEET_COLUMNS = {
  DATE: 0,
  PLAYER_1: 1,
  PLAYER_2: 2,
  PLAYER_3: 3,
  PLAYER_4: 4,
  PLAYER_5: 5,
  SUB_1: 6,
  SUB_2: 7,
  COACH: 8,
  REASON: 9,
  FOCUS: 10,
};

// Match Sheet Column indices (0-based)
export const SCRIM_SHEET_COLUMNS = {
  ID: 0,
  DATE: 1,
  OPPONENT: 2,
  RESULT: 3,
  SCORE_US: 4,
  SCORE_THEM: 5,
  MAPS: 6,
  MATCH_TYPE: 7,
  OUR_AGENTS: 8,
  THEIR_AGENTS: 9,
  VOD_URL: 10,
  NOTES: 11,
  CREATED_AT: 12,
  UPDATED_AT: 13,
};

export const SCRIM_SHEET_NAME = 'Matches';

