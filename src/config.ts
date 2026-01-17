import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { loadSettings, reloadSettings } from './settingsManager.js';

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
  googleSheets: {
    sheetId: requireEnv('GOOGLE_SHEET_ID'),
    credentialsPath: process.env.GOOGLE_CREDENTIALS_PATH || './credentials.json',
  },
  scheduling: {
    dailyPostTime: settings.scheduling.dailyPostTime,
    timezone: settings.scheduling.timezone,
    reminderHoursBefore: settings.scheduling.reminderHoursBefore,
    trainingStartPollEnabled: settings.scheduling.trainingStartPollEnabled,
  },
};

// Function to reload settings at runtime
export function reloadConfig(): void {
  settings = reloadSettings(); // Force reload from disk, bypass cache
  
  // Update config with new settings
  config.discord.channelId = settings.discord.channelId;
  config.discord.pingRoleId = settings.discord.pingRoleId;
  config.scheduling.dailyPostTime = settings.scheduling.dailyPostTime;
  config.scheduling.timezone = settings.scheduling.timezone;
  config.scheduling.reminderHoursBefore = settings.scheduling.reminderHoursBefore;
  config.scheduling.trainingStartPollEnabled = settings.scheduling.trainingStartPollEnabled;
  
  console.log('Configuration reloaded from settings.json');
  console.log('New pingRoleId:', config.discord.pingRoleId);
  console.log('New channelId:', config.discord.channelId);
  console.log('New dailyPostTime:', config.scheduling.dailyPostTime);
}

// Column indices in the Google Sheet (0-based)
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

