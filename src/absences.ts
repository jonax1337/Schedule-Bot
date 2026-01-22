import { google } from 'googleapis';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { config } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface Absence {
  id: string;
  discordId: string;
  username: string;
  startDate: string; // Format: DD.MM.YYYY
  endDate: string;   // Format: DD.MM.YYYY
  reason: string;
  createdAt: string; // ISO timestamp
}

let sheetsApi: ReturnType<typeof google.sheets> | null = null;
let absencesSheetChecked = false; // Cache to avoid repeated checks

// Cache for absences data
let absencesCache: Absence[] | null = null;
let absencesCacheTimestamp = 0;
const ABSENCES_CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

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

async function getSheetId(sheetName: string): Promise<number> {
  const sheets = await getAuthenticatedClient();
  
  const response = await sheets.spreadsheets.get({
    spreadsheetId: config.googleSheets.sheetId,
  });

  const sheet = response.data.sheets?.find(s => s.properties?.title === sheetName);
  if (!sheet?.properties?.sheetId) {
    throw new Error(`Could not find sheet: ${sheetName}`);
  }

  return sheet.properties.sheetId;
}

export async function ensureAbsencesSheetExists(): Promise<void> {
  // Return early if already checked
  if (absencesSheetChecked) {
    return;
  }

  const sheets = await getAuthenticatedClient();
  
  try {
    await sheets.spreadsheets.values.get({
      spreadsheetId: config.googleSheets.sheetId,
      range: 'Absences!A1',
    });
    absencesSheetChecked = true;
    console.log('[Absences] Sheet verified');
  } catch (error) {
    console.log('[Absences] Creating sheet...');
    
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: config.googleSheets.sheetId,
      requestBody: {
        requests: [{
          addSheet: {
            properties: {
              title: 'Absences',
              gridProperties: {
                rowCount: 100,
                columnCount: 6,
              },
            },
          },
        }],
      },
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId: config.googleSheets.sheetId,
      range: 'Absences!A1:F1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [['ID', 'Discord ID', 'Username', 'Start Date', 'End Date', 'Reason', 'Created At']],
      },
    });

    absencesSheetChecked = true;
    console.log('[Absences] Sheet created successfully');
  }
}

function generateId(): string {
  return `abs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export async function getAllAbsences(forceRefresh = false): Promise<Absence[]> {
  // Return cached data if still valid
  const now = Date.now();
  if (!forceRefresh && absencesCache && (now - absencesCacheTimestamp) < ABSENCES_CACHE_DURATION) {
    return absencesCache;
  }

  await ensureAbsencesSheetExists();
  
  const sheets = await getAuthenticatedClient();
  
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: config.googleSheets.sheetId,
    range: 'Absences!A:G',
  });

  const rows = response.data.values;
  if (!rows || rows.length < 2) {
    absencesCache = [];
    absencesCacheTimestamp = now;
    return [];
  }

  const absences: Absence[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row && row.length >= 6) {
      absences.push({
        id: row[0] || '',
        discordId: row[1] || '',
        username: row[2] || '',
        startDate: row[3] || '',
        endDate: row[4] || '',
        reason: row[5] || '',
        createdAt: row[6] || new Date().toISOString(),
      });
    }
  }

  // Update cache
  absencesCache = absences;
  absencesCacheTimestamp = now;

  return absences;
}

export async function getAbsencesByUser(discordId: string): Promise<Absence[]> {
  const allAbsences = await getAllAbsences();
  return allAbsences.filter(a => a.discordId === discordId);
}

export async function getAbsenceById(id: string): Promise<Absence | null> {
  const allAbsences = await getAllAbsences();
  return allAbsences.find(a => a.id === id) || null;
}

export async function addAbsence(absence: Omit<Absence, 'id' | 'createdAt'>): Promise<Absence> {
  await ensureAbsencesSheetExists();
  
  const sheets = await getAuthenticatedClient();
  
  const newAbsence: Absence = {
    id: generateId(),
    ...absence,
    createdAt: new Date().toISOString(),
  };

  await sheets.spreadsheets.values.append({
    spreadsheetId: config.googleSheets.sheetId,
    range: 'Absences!A:G',
    valueInputOption: 'RAW',
    requestBody: {
      values: [[
        newAbsence.id,
        newAbsence.discordId,
        newAbsence.username,
        newAbsence.startDate,
        newAbsence.endDate,
        newAbsence.reason,
        newAbsence.createdAt,
      ]],
    },
  });

  // Invalidate cache
  absencesCache = null;
  
  console.log(`Absence added: ${newAbsence.username} from ${newAbsence.startDate} to ${newAbsence.endDate}`);
  return newAbsence;
}

export async function updateAbsence(id: string, updates: Partial<Omit<Absence, 'id' | 'discordId' | 'createdAt'>>): Promise<Absence | null> {
  const sheets = await getAuthenticatedClient();
  
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: config.googleSheets.sheetId,
    range: 'Absences!A:G',
  });

  const rows = response.data.values;
  if (!rows || rows.length < 2) {
    return null;
  }

  let rowIndex = -1;
  let existingAbsence: Absence | null = null;
  
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === id) {
      rowIndex = i + 1;
      existingAbsence = {
        id: rows[i][0],
        discordId: rows[i][1],
        username: rows[i][2],
        startDate: rows[i][3],
        endDate: rows[i][4],
        reason: rows[i][5],
        createdAt: rows[i][6],
      };
      break;
    }
  }

  if (rowIndex === -1 || !existingAbsence) {
    return null;
  }

  const updatedAbsence: Absence = {
    ...existingAbsence,
    username: updates.username ?? existingAbsence.username,
    startDate: updates.startDate ?? existingAbsence.startDate,
    endDate: updates.endDate ?? existingAbsence.endDate,
    reason: updates.reason ?? existingAbsence.reason,
  };

  await sheets.spreadsheets.values.update({
    spreadsheetId: config.googleSheets.sheetId,
    range: `Absences!A${rowIndex}:G${rowIndex}`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [[
        updatedAbsence.id,
        updatedAbsence.discordId,
        updatedAbsence.username,
        updatedAbsence.startDate,
        updatedAbsence.endDate,
        updatedAbsence.reason,
        updatedAbsence.createdAt,
      ]],
    },
  });

  // Invalidate cache
  absencesCache = null;
  
  console.log(`Absence updated: ${id}`);
  return updatedAbsence;
}

export async function deleteAbsence(id: string): Promise<boolean> {
  const sheets = await getAuthenticatedClient();
  
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: config.googleSheets.sheetId,
    range: 'Absences!A:G',
  });

  const rows = response.data.values;
  if (!rows || rows.length < 2) {
    return false;
  }

  let rowIndex = -1;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === id) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex === -1) {
    return false;
  }

  const sheetId = await getSheetId('Absences');
  
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: config.googleSheets.sheetId,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId: sheetId,
            dimension: 'ROWS',
            startIndex: rowIndex - 1,
            endIndex: rowIndex,
          },
        },
      }],
    },
  });

  // Invalidate cache
  absencesCache = null;
  
  console.log(`Absence deleted: ${id}`);
  return true;
}

function parseDateString(dateStr: string): Date | null {
  const match = dateStr.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!match) return null;

  const [, day, month, year] = match;
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
}

export function isDateInAbsence(date: string, absence: Absence): boolean {
  const checkDate = parseDateString(date);
  const startDate = parseDateString(absence.startDate);
  const endDate = parseDateString(absence.endDate);

  if (!checkDate || !startDate || !endDate) {
    return false;
  }

  return checkDate >= startDate && checkDate <= endDate;
}

export async function getActiveAbsencesForDate(date: string): Promise<Absence[]> {
  const allAbsences = await getAllAbsences();
  return allAbsences.filter(absence => isDateInAbsence(date, absence));
}

export async function getUsersAbsentOnDate(date: string): Promise<string[]> {
  const activeAbsences = await getActiveAbsencesForDate(date);
  return activeAbsences.map(a => a.discordId);
}
