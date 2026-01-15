import { google } from 'googleapis';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { config, SHEET_COLUMNS } from './config.js';
import type { SheetData, PlayerNames } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let sheetsApi: ReturnType<typeof google.sheets> | null = null;

async function getAuthenticatedClient() {
  if (sheetsApi) return sheetsApi;

  const credentialsPath = resolve(__dirname, '..', config.googleSheets.credentialsPath);
  const credentials = JSON.parse(readFileSync(credentialsPath, 'utf-8'));

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  sheetsApi = google.sheets({ version: 'v4', auth });
  return sheetsApi;
}

function formatDateForComparison(dateStr: string): string {
  // Handle various date formats and normalize to DD.MM.YYYY
  const cleanDate = dateStr.trim();

  // Try DD.MM.YYYY format
  const dotMatch = cleanDate.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (dotMatch) {
    const [, day, month, year] = dotMatch;
    return `${day.padStart(2, '0')}.${month.padStart(2, '0')}.${year}`;
  }

  // Try YYYY-MM-DD format
  const isoMatch = cleanDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${day}.${month}.${year}`;
  }

  // Try DD/MM/YYYY format
  const slashMatch = cleanDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, day, month, year] = slashMatch;
    return `${day.padStart(2, '0')}.${month.padStart(2, '0')}.${year}`;
  }

  return cleanDate;
}

function getTodayFormatted(): string {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  return `${day}.${month}.${year}`;
}

export async function getScheduleForDate(targetDate?: string): Promise<SheetData | null> {
  const sheets = await getAuthenticatedClient();
  const dateToFind = targetDate ? formatDateForComparison(targetDate) : getTodayFormatted();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: config.googleSheets.sheetId,
    range: 'A:K', // Date through Focus columns
  });

  const rows = response.data.values;
  if (!rows || rows.length < 2) {
    console.log('No data found in sheet.');
    return null;
  }

  // Read header row (index 0) for player names
  const headerRow = rows[0];
  const names: PlayerNames = {
    player1: headerRow[SHEET_COLUMNS.PLAYER_1] || 'Player 1',
    player2: headerRow[SHEET_COLUMNS.PLAYER_2] || 'Player 2',
    player3: headerRow[SHEET_COLUMNS.PLAYER_3] || 'Player 3',
    player4: headerRow[SHEET_COLUMNS.PLAYER_4] || 'Player 4',
    player5: headerRow[SHEET_COLUMNS.PLAYER_5] || 'Player 5',
    sub1: headerRow[SHEET_COLUMNS.SUB_1] || 'Sub 1',
    sub2: headerRow[SHEET_COLUMNS.SUB_2] || 'Sub 2',
    coach: headerRow[SHEET_COLUMNS.COACH] || 'Coach',
  };

  // Search for the target date starting from row 1
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const rowDate = formatDateForComparison(row[SHEET_COLUMNS.DATE] || '');

    if (rowDate === dateToFind) {
      return {
        date: row[SHEET_COLUMNS.DATE] || '',
        players: {
          player1: row[SHEET_COLUMNS.PLAYER_1] || '',
          player2: row[SHEET_COLUMNS.PLAYER_2] || '',
          player3: row[SHEET_COLUMNS.PLAYER_3] || '',
          player4: row[SHEET_COLUMNS.PLAYER_4] || '',
          player5: row[SHEET_COLUMNS.PLAYER_5] || '',
          sub1: row[SHEET_COLUMNS.SUB_1] || '',
          sub2: row[SHEET_COLUMNS.SUB_2] || '',
          coach: row[SHEET_COLUMNS.COACH] || '',
        },
        names,
        reason: row[SHEET_COLUMNS.REASON] || '',
        focus: row[SHEET_COLUMNS.FOCUS] || '',
      };
    }
  }

  console.log(`No schedule found for date: ${dateToFind}`);
  return null;
}

export async function testConnection(): Promise<boolean> {
  try {
    const sheets = await getAuthenticatedClient();
    await sheets.spreadsheets.get({
      spreadsheetId: config.googleSheets.sheetId,
    });
    return true;
  } catch (error) {
    console.error('Failed to connect to Google Sheets:', error);
    return false;
  }
}
