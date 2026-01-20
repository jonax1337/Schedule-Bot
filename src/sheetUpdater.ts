import { google } from 'googleapis';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { config, SHEET_COLUMNS } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let sheetsApi: ReturnType<typeof google.sheets> | null = null;

export async function getAuthenticatedClient() {
  if (sheetsApi) return sheetsApi;

  const credentialsPath = resolve(__dirname, '..', config.googleSheets.credentialsPath);
  const credentials = JSON.parse(readFileSync(credentialsPath, 'utf-8'));

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  sheetsApi = google.sheets({ version: 'v4', auth });
  return sheetsApi;
}

function formatDateForComparison(dateStr: string): string {
  const cleanDate = dateStr.trim();

  const dotMatch = cleanDate.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (dotMatch) {
    const [, day, month, year] = dotMatch;
    return `${day.padStart(2, '0')}.${month.padStart(2, '0')}.${year}`;
  }

  const isoMatch = cleanDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${day}.${month}.${year}`;
  }

  const slashMatch = cleanDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, day, month, year] = slashMatch;
    return `${day.padStart(2, '0')}.${month.padStart(2, '0')}.${year}`;
  }

  return cleanDate;
}

export async function updatePlayerAvailability(
  date: string,
  columnName: string,
  timeRange: string
): Promise<boolean> {
  const sheets = await getAuthenticatedClient();
  const dateToFind = formatDateForComparison(date);

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: config.googleSheets.sheetId,
    range: 'A:K',
  });

  const rows = response.data.values;
  if (!rows || rows.length < 2) {
    return false;
  }

  const headerRow = rows[0];
  const columnIndex = headerRow.findIndex((col: string) => col === columnName);
  
  if (columnIndex === -1) {
    console.error(`Column "${columnName}" not found in header row`);
    return false;
  }

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const rowDate = formatDateForComparison(row[SHEET_COLUMNS.DATE] || '');

    if (rowDate === dateToFind) {
      const rowNumber = i + 1;
      const columnLetter = getColumnLetter(columnIndex);
      const cellRange = `${columnLetter}${rowNumber}`;

      await sheets.spreadsheets.values.update({
        spreadsheetId: config.googleSheets.sheetId,
        range: cellRange,
        valueInputOption: 'RAW',
        requestBody: {
          values: [[timeRange]],
        },
      });

      console.log(`Updated ${columnName} for ${dateToFind} to: ${timeRange}`);
      
      // Check for status change and notify if improved
      try {
        const { checkAndNotifyStatusChange } = await import('./changeNotifier.js');
        const { client } = await import('./bot.js');
        if (client && client.isReady()) {
          await checkAndNotifyStatusChange(dateToFind, client);
        }
      } catch (error) {
        console.error('[SheetUpdater] Error checking status change:', error);
      }
      
      return true;
    }
  }

  console.log(`No row found for date: ${dateToFind}`);
  return false;
}

export async function getPlayerAvailabilityForRange(
  columnName: string,
  startDate: string,
  endDate: string
): Promise<Array<{ date: string; availability: string }>> {
  const sheets = await getAuthenticatedClient();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: config.googleSheets.sheetId,
    range: 'A:K',
  });

  const rows = response.data.values;
  if (!rows || rows.length < 2) {
    return [];
  }

  const headerRow = rows[0];
  const columnIndex = headerRow.findIndex((col: string) => col === columnName);
  
  if (columnIndex === -1) {
    return [];
  }

  const startDateFormatted = formatDateForComparison(startDate);
  const endDateFormatted = formatDateForComparison(endDate);
  const startDateObj = parseDateString(startDateFormatted);
  const endDateObj = parseDateString(endDateFormatted);

  if (!startDateObj || !endDateObj) {
    return [];
  }

  const result: Array<{ date: string; availability: string }> = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const rowDate = formatDateForComparison(row[SHEET_COLUMNS.DATE] || '');
    const rowDateObj = parseDateString(rowDate);

    if (rowDateObj && rowDateObj >= startDateObj && rowDateObj <= endDateObj) {
      result.push({
        date: row[SHEET_COLUMNS.DATE] || '',
        availability: row[columnIndex] || '',
      });
    }
  }

  return result;
}

export async function getAvailableDates(): Promise<string[]> {
  const sheets = await getAuthenticatedClient();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: config.googleSheets.sheetId,
    range: 'A:A',
  });

  const rows = response.data.values;
  if (!rows || rows.length < 2) {
    return [];
  }

  const dates: string[] = [];
  for (let i = 1; i < rows.length; i++) {
    if (rows[i] && rows[i][0]) {
      dates.push(rows[i][0]);
    }
  }

  return dates;
}

function getColumnLetter(index: number): string {
  let letter = '';
  while (index >= 0) {
    letter = String.fromCharCode((index % 26) + 65) + letter;
    index = Math.floor(index / 26) - 1;
  }
  return letter;
}

function parseDateString(dateStr: string): Date | null {
  const match = dateStr.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!match) return null;

  const [, day, month, year] = match;
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
}

export async function bulkUpdateAvailability(
  columnName: string,
  updates: Array<{ date: string; timeRange: string }>
): Promise<number> {
  let successCount = 0;

  for (const update of updates) {
    const success = await updatePlayerAvailability(update.date, columnName, update.timeRange);
    if (success) successCount++;
  }

  return successCount;
}
