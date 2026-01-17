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
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  sheetsApi = google.sheets({ version: 'v4', auth });
  return sheetsApi;
}

async function getFirstSheetId(): Promise<number> {
  const sheets = await getAuthenticatedClient();
  
  const response = await sheets.spreadsheets.get({
    spreadsheetId: config.googleSheets.sheetId,
  });

  const firstSheet = response.data.sheets?.[0];
  if (!firstSheet?.properties?.sheetId) {
    throw new Error('Could not find first sheet ID');
  }

  return firstSheet.properties.sheetId;
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

export async function getSheetColumns(): Promise<Array<{ column: string; name: string; index: number }>> {
  const sheets = await getAuthenticatedClient();
  
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: config.googleSheets.sheetId,
    range: 'A1:Z1',
  });

  const headerRow = response.data.values?.[0];
  if (!headerRow) {
    return [];
  }

  const columns: Array<{ column: string; name: string; index: number }> = [];
  
  // Start from column B (index 1) to I (index 8) - Player columns
  for (let i = 1; i <= 8; i++) {
    const name = headerRow[i];
    if (name && name.trim()) {
      const columnLetter = String.fromCharCode(65 + i); // A=65 in ASCII, so B=66
      columns.push({
        column: columnLetter,
        name: name.trim(),
        index: i,
      });
    }
  }

  return columns;
}

export async function getSheetDataRange(startRow: number = 1, endRow: number = 50): Promise<any[][]> {
  const sheets = await getAuthenticatedClient();
  
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: config.googleSheets.sheetId,
    range: `A${startRow}:K${endRow}`,
  });

  return response.data.values || [];
}

export async function updateSheetCell(row: number, column: string, value: string): Promise<void> {
  const sheets = await getAuthenticatedClient();
  
  await sheets.spreadsheets.values.update({
    spreadsheetId: config.googleSheets.sheetId,
    range: `${column}${row}`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [[value]],
    },
  });
}

export async function deleteOldRows(): Promise<number> {
  try {
    const sheets = await getAuthenticatedClient();
    
    // Fetch all rows from the sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: config.googleSheets.sheetId,
      range: 'A:K',
    });

    const rows = response.data.values;
    if (!rows || rows.length < 2) {
      console.log('No data rows to check for deletion.');
      return 0;
    }

    // Get today's date and calculate the 14-day window
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const maxFutureDate = new Date(today);
    maxFutureDate.setDate(maxFutureDate.getDate() + 13); // Today + 13 days = 14 days total

    // Find rows to delete (older than today OR more than 14 days in the future)
    const rowsToDelete: number[] = [];
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      const dateStr = row[SHEET_COLUMNS.DATE];
      if (!dateStr) continue;

      const rowDate = parseDateString(dateStr);
      if (rowDate && (rowDate < today || rowDate > maxFutureDate)) {
        // Row index in sheet is i + 1 (1-based, +1 for header)
        rowsToDelete.push(i + 1);
      }
    }

    let deletedCount = 0;

    if (rowsToDelete.length > 0) {
      // Delete rows in reverse order to avoid index shifting
      console.log(`Deleting ${rowsToDelete.length} row(s) outside the 14-day window...`);
      
      const sheetId = await getFirstSheetId();
      const deleteRequests = rowsToDelete.reverse().map(rowIndex => ({
        deleteDimension: {
          range: {
            sheetId: sheetId,
            dimension: 'ROWS',
            startIndex: rowIndex - 1, // 0-based for API
            endIndex: rowIndex, // Exclusive
          },
        },
      }));

      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: config.googleSheets.sheetId,
        requestBody: {
          requests: deleteRequests,
        },
      });

      console.log(`Successfully deleted ${rowsToDelete.length} row(s) outside the 14-day window.`);
      deletedCount = rowsToDelete.length;
    } else {
      console.log('No rows outside the 14-day window to delete.');
    }

    // Add missing days
    await addMissingDays();

    return deletedCount;
  } catch (error) {
    console.error('Error deleting rows:', error);
    throw error;
  }
}

function parseDateString(dateStr: string): Date | null {
  const formatted = formatDateForComparison(dateStr);
  
  // Parse DD.MM.YYYY format
  const match = formatted.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!match) return null;

  const [, day, month, year] = match;
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
}

function formatDateToString(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

async function addMissingDays(): Promise<number> {
  try {
    const sheets = await getAuthenticatedClient();
    
    // Fetch current rows
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: config.googleSheets.sheetId,
      range: 'A:K',
    });

    const rows = response.data.values;
    if (!rows || rows.length < 1) {
      console.log('No header row found.');
      return 0;
    }

    // Get today's date and calculate the 14-day window
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Collect existing dates
    const existingDates = new Set<string>();
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;
      
      const dateStr = row[SHEET_COLUMNS.DATE];
      if (dateStr) {
        const parsedDate = parseDateString(dateStr);
        if (parsedDate) {
          existingDates.add(formatDateToString(parsedDate));
        }
      }
    }

    // Find missing dates in the 14-day window
    const missingDates: string[] = [];
    for (let i = 0; i < 14; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() + i);
      const dateStr = formatDateToString(checkDate);
      
      if (!existingDates.has(dateStr)) {
        missingDates.push(dateStr);
      }
    }

    if (missingDates.length === 0) {
      console.log('No missing dates to add.');
      return 0;
    }

    console.log(`Adding ${missingDates.length} missing date(s): ${missingDates.join(', ')}`);

    // Create new rows with empty values (11 columns: Date + 8 players + Reason + Focus)
    const newRows = missingDates.map(date => [
      date,  // Date
      '',    // Player 1
      '',    // Player 2
      '',    // Player 3
      '',    // Player 4
      '',    // Player 5
      '',    // Sub 1
      '',    // Sub 2
      '',    // Coach
      '',    // Reason
      '',    // Focus
    ]);

    // Get the sheet ID and last row index for formatting
    const sheetId = await getFirstSheetId();
    const lastRowIndex = rows.length; // 1-based index of the last row
    const newRowCount = missingDates.length;

    // First, insert empty rows at the end
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: config.googleSheets.sheetId,
      requestBody: {
        requests: [
          {
            insertDimension: {
              range: {
                sheetId: sheetId,
                dimension: 'ROWS',
                startIndex: lastRowIndex,
                endIndex: lastRowIndex + newRowCount,
              },
            },
          },
        ],
      },
    });

    // Copy formatting from the last existing row to the new rows
    if (lastRowIndex > 1) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: config.googleSheets.sheetId,
        requestBody: {
          requests: [
            {
              copyPaste: {
                source: {
                  sheetId: sheetId,
                  startRowIndex: lastRowIndex - 1,
                  endRowIndex: lastRowIndex,
                  startColumnIndex: 0,
                  endColumnIndex: 11,
                },
                destination: {
                  sheetId: sheetId,
                  startRowIndex: lastRowIndex,
                  endRowIndex: lastRowIndex + newRowCount,
                  startColumnIndex: 0,
                  endColumnIndex: 11,
                },
                pasteType: 'PASTE_FORMAT',
              },
            },
          ],
        },
      });
    }

    // Now add the values to the new rows
    await sheets.spreadsheets.values.update({
      spreadsheetId: config.googleSheets.sheetId,
      range: `A${lastRowIndex + 1}:K${lastRowIndex + newRowCount}`,
      valueInputOption: 'RAW',
      requestBody: {
        values: newRows,
      },
    });

    // Sort the sheet by date (column A)
    await sortSheetByDate();

    console.log(`Successfully added ${missingDates.length} missing date(s) with formatting.`);
    return missingDates.length;
  } catch (error) {
    console.error('Error adding missing days:', error);
    throw error;
  }
}

async function sortSheetByDate(): Promise<void> {
  try {
    const sheets = await getAuthenticatedClient();
    const sheetId = await getFirstSheetId();
    
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: config.googleSheets.sheetId,
      requestBody: {
        requests: [
          {
            sortRange: {
              range: {
                sheetId: sheetId,
                startRowIndex: 1, // Start after header
                startColumnIndex: 0,
                endColumnIndex: 11, // A:K
              },
              sortSpecs: [
                {
                  dimensionIndex: 0, // Sort by column A (Date)
                  sortOrder: 'ASCENDING',
                },
              ],
            },
          },
        ],
      },
    });

    console.log('Sheet sorted by date.');
  } catch (error) {
    console.error('Error sorting sheet:', error);
    throw error;
  }
}
