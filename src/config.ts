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
  },
  googleSheets: {
    sheetId: requireEnv('GOOGLE_SHEET_ID'),
    credentialsPath: process.env.GOOGLE_CREDENTIALS_PATH || './credentials.json',
  },
  scheduling: {
    dailyPostTime: process.env.DAILY_POST_TIME || '10:00',
    timezone: process.env.TIMEZONE || 'Europe/Berlin',
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

export const PLAYER_NAMES = {
  [SHEET_COLUMNS.PLAYER_1]: 'Player 1',
  [SHEET_COLUMNS.PLAYER_2]: 'Player 2',
  [SHEET_COLUMNS.PLAYER_3]: 'Player 3',
  [SHEET_COLUMNS.PLAYER_4]: 'Player 4',
  [SHEET_COLUMNS.PLAYER_5]: 'Player 5',
  [SHEET_COLUMNS.SUB_1]: 'Sub 1',
  [SHEET_COLUMNS.SUB_2]: 'Sub 2',
  [SHEET_COLUMNS.COACH]: 'Coach',
};
