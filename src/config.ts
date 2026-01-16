import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env') });

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
    channelId: requireEnv('DISCORD_CHANNEL_ID'),
    guildId: requireEnv('DISCORD_GUILD_ID'),
    pingRoleId: process.env.DISCORD_PING_ROLE_ID || null,
  },
  googleSheets: {
    sheetId: requireEnv('GOOGLE_SHEET_ID'),
    credentialsPath: process.env.GOOGLE_CREDENTIALS_PATH || './credentials.json',
  },
  scheduling: {
    dailyPostTime: process.env.DAILY_POST_TIME || '10:00',
    timezone: process.env.TIMEZONE || 'Europe/Berlin',
    reminderHoursBefore: parseInt(process.env.REMINDER_HOURS_BEFORE || '3', 10),
  },
};

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
