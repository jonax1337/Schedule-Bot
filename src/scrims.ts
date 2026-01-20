import { google } from 'googleapis';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { config, SCRIM_SHEET_COLUMNS, SCRIM_SHEET_NAME } from './config.js';
import type { ScrimEntry, ScrimStats } from './types.js';

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

function generateScrimId(): string {
  return `scrim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export async function ensureScrimSheetExists(): Promise<void> {
  const sheets = await getAuthenticatedClient();
  
  try {
    // Check if Scrims sheet exists
    const response = await sheets.spreadsheets.get({
      spreadsheetId: config.googleSheets.sheetId,
    });

    const scrimSheet = response.data.sheets?.find(
      (sheet) => sheet.properties?.title === SCRIM_SHEET_NAME
    );

    if (!scrimSheet) {
      // Create the Matches sheet
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: config.googleSheets.sheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: SCRIM_SHEET_NAME,
                },
              },
            },
          ],
        },
      });

      // Add header row
      await sheets.spreadsheets.values.update({
        spreadsheetId: config.googleSheets.sheetId,
        range: `${SCRIM_SHEET_NAME}!A1:N1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [
            [
              'ID',
              'Date',
              'Opponent',
              'Result',
              'Score Us',
              'Score Them',
              'Maps',
              'Match Type',
              'Our Agents',
              'Their Agents',
              'VOD URL',
              'Notes',
              'Created At',
              'Updated At',
            ],
          ],
        },
      });

      console.log(`Created ${SCRIM_SHEET_NAME} sheet with headers`);
    }
  } catch (error) {
    console.error('Error ensuring scrim sheet exists:', error);
    throw error;
  }
}

export async function getAllScrims(): Promise<ScrimEntry[]> {
  const sheets = await getAuthenticatedClient();

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: config.googleSheets.sheetId,
      range: `${SCRIM_SHEET_NAME}!A2:N`, // Skip header row, include match type column
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return [];
    }

    return rows.map((row) => ({
      id: row[SCRIM_SHEET_COLUMNS.ID] || '',
      date: row[SCRIM_SHEET_COLUMNS.DATE] || '',
      opponent: row[SCRIM_SHEET_COLUMNS.OPPONENT] || '',
      result: (row[SCRIM_SHEET_COLUMNS.RESULT] || 'loss') as 'win' | 'loss' | 'draw',
      scoreUs: parseInt(row[SCRIM_SHEET_COLUMNS.SCORE_US] || '0', 10),
      scoreThem: parseInt(row[SCRIM_SHEET_COLUMNS.SCORE_THEM] || '0', 10),
      map: row[SCRIM_SHEET_COLUMNS.MAPS] || '',
      matchType: row[SCRIM_SHEET_COLUMNS.MATCH_TYPE] || '',
      ourAgents: (row[SCRIM_SHEET_COLUMNS.OUR_AGENTS] || '').split(',').filter(Boolean),
      theirAgents: (row[SCRIM_SHEET_COLUMNS.THEIR_AGENTS] || '').split(',').filter(Boolean),
      vodUrl: row[SCRIM_SHEET_COLUMNS.VOD_URL] || '',
      notes: row[SCRIM_SHEET_COLUMNS.NOTES] || '',
      createdAt: row[SCRIM_SHEET_COLUMNS.CREATED_AT] || new Date().toISOString(),
      updatedAt: row[SCRIM_SHEET_COLUMNS.UPDATED_AT] || new Date().toISOString(),
    }));
  } catch (error) {
    console.error('Error getting scrims:', error);
    return [];
  }
}

export async function getScrimById(id: string): Promise<ScrimEntry | null> {
  const scrims = await getAllScrims();
  return scrims.find((scrim) => scrim.id === id) || null;
}

export async function addScrim(
  scrim: Omit<ScrimEntry, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ScrimEntry> {
  const sheets = await getAuthenticatedClient();

  const newScrim: ScrimEntry = {
    ...scrim,
    id: generateScrimId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const row = [
    newScrim.id,
    newScrim.date,
    newScrim.opponent,
    newScrim.result,
    newScrim.scoreUs.toString(),
    newScrim.scoreThem.toString(),
    newScrim.map || '',
    newScrim.matchType || '',
    newScrim.ourAgents.join(','),
    newScrim.theirAgents.join(','),
    newScrim.vodUrl,
    newScrim.notes,
    newScrim.createdAt,
    newScrim.updatedAt,
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: config.googleSheets.sheetId,
    range: `${SCRIM_SHEET_NAME}!A:N`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [row],
    },
  });

  console.log('Added scrim:', newScrim.id);
  return newScrim;
}

export async function updateScrim(
  id: string,
  updates: Partial<Omit<ScrimEntry, 'id' | 'createdAt'>>
): Promise<ScrimEntry | null> {
  const sheets = await getAuthenticatedClient();

  // Get all scrims to find the row index
  const scrims = await getAllScrims();
  const scrimIndex = scrims.findIndex((s) => s.id === id);

  if (scrimIndex === -1) {
    console.error('Scrim not found:', id);
    return null;
  }

  const existingScrim = scrims[scrimIndex];
  const updatedScrim: ScrimEntry = {
    ...existingScrim,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  const rowNumber = scrimIndex + 2; // +1 for header, +1 for 1-based indexing
  const row = [
    updatedScrim.id,
    updatedScrim.date,
    updatedScrim.opponent,
    updatedScrim.result,
    updatedScrim.scoreUs.toString(),
    updatedScrim.scoreThem.toString(),
    updatedScrim.map || '',
    updatedScrim.matchType || '',
    updatedScrim.ourAgents.join(','),
    updatedScrim.theirAgents.join(','),
    updatedScrim.vodUrl,
    updatedScrim.notes,
    updatedScrim.createdAt,
    updatedScrim.updatedAt,
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId: config.googleSheets.sheetId,
    range: `${SCRIM_SHEET_NAME}!A${rowNumber}:N${rowNumber}`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [row],
    },
  });

  console.log('Updated scrim:', id);
  return updatedScrim;
}

export async function deleteScrim(id: string): Promise<boolean> {
  const sheets = await getAuthenticatedClient();

  // Get all scrims to find the row index
  const scrims = await getAllScrims();
  const scrimIndex = scrims.findIndex((s) => s.id === id);

  if (scrimIndex === -1) {
    console.error('Scrim not found:', id);
    return false;
  }

  // Get the sheet ID
  const response = await sheets.spreadsheets.get({
    spreadsheetId: config.googleSheets.sheetId,
  });

  const scrimSheet = response.data.sheets?.find(
    (sheet) => sheet.properties?.title === SCRIM_SHEET_NAME
  );

  if (!scrimSheet?.properties?.sheetId) {
    console.error('Scrim sheet not found');
    return false;
  }

  const rowNumber = scrimIndex + 1; // +1 for header (0-based for deletion)

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: config.googleSheets.sheetId,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: scrimSheet.properties.sheetId,
              dimension: 'ROWS',
              startIndex: rowNumber,
              endIndex: rowNumber + 1,
            },
          },
        },
      ],
    },
  });

  console.log('Deleted scrim:', id);
  return true;
}

export async function getScrimStats(): Promise<ScrimStats> {
  const scrims = await getAllScrims();

  const stats: ScrimStats = {
    totalScrims: scrims.length,
    wins: 0,
    losses: 0,
    draws: 0,
    winRate: 0,
    mapStats: {},
  };

  for (const scrim of scrims) {
    // Count results
    if (scrim.result === 'win') stats.wins++;
    else if (scrim.result === 'loss') stats.losses++;
    else if (scrim.result === 'draw') stats.draws++;

    // Count map stats
    for (const map of scrim.maps) {
      if (!stats.mapStats[map]) {
        stats.mapStats[map] = { played: 0, wins: 0, losses: 0 };
      }
      stats.mapStats[map].played++;
      if (scrim.result === 'win') stats.mapStats[map].wins++;
      else if (scrim.result === 'loss') stats.mapStats[map].losses++;
    }
  }

  stats.winRate = stats.totalScrims > 0 ? (stats.wins / stats.totalScrims) * 100 : 0;

  return stats;
}

export async function getScrimsByDateRange(
  startDate: string,
  endDate: string
): Promise<ScrimEntry[]> {
  const scrims = await getAllScrims();
  
  // Simple date comparison (DD.MM.YYYY format)
  return scrims.filter((scrim) => {
    const scrimDate = scrim.date;
    return scrimDate >= startDate && scrimDate <= endDate;
  });
}
