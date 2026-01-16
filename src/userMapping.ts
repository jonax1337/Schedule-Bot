import { google } from 'googleapis';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { config } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface UserMapping {
  discordId: string;
  discordUsername: string;
  sheetColumnName: string;
  role: 'main' | 'sub' | 'coach';
}

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

export async function getUserMappings(): Promise<UserMapping[]> {
  const sheets = await getAuthenticatedClient();
  
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: config.googleSheets.sheetId,
    range: 'UserMapping!A:D',
  });

  const rows = response.data.values;
  if (!rows || rows.length < 2) {
    return [];
  }

  const mappings: UserMapping[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row && row.length >= 4) {
      mappings.push({
        discordId: row[0],
        discordUsername: row[1],
        sheetColumnName: row[2],
        role: row[3] as 'main' | 'sub' | 'coach',
      });
    }
  }

  return mappings;
}

export async function addUserMapping(mapping: UserMapping): Promise<void> {
  const sheets = await getAuthenticatedClient();
  
  await sheets.spreadsheets.values.append({
    spreadsheetId: config.googleSheets.sheetId,
    range: 'UserMapping!A:D',
    valueInputOption: 'RAW',
    requestBody: {
      values: [[
        mapping.discordId,
        mapping.discordUsername,
        mapping.sheetColumnName,
        mapping.role,
      ]],
    },
  });
}

export async function getUserMapping(discordId: string): Promise<UserMapping | null> {
  const mappings = await getUserMappings();
  return mappings.find(m => m.discordId === discordId) || null;
}

export async function removeUserMapping(discordId: string): Promise<boolean> {
  const sheets = await getAuthenticatedClient();
  
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: config.googleSheets.sheetId,
    range: 'UserMapping!A:D',
  });

  const rows = response.data.values;
  if (!rows || rows.length < 2) {
    return false;
  }

  let rowIndex = -1;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === discordId) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex === -1) {
    return false;
  }

  const sheetId = await getFirstSheetId('UserMapping');
  
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

  return true;
}

async function getFirstSheetId(sheetName: string): Promise<number> {
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

export async function initializeUserMappingSheet(): Promise<void> {
  const sheets = await getAuthenticatedClient();
  
  try {
    await sheets.spreadsheets.values.get({
      spreadsheetId: config.googleSheets.sheetId,
      range: 'UserMapping!A1',
    });
  } catch (error) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: config.googleSheets.sheetId,
      requestBody: {
        requests: [{
          addSheet: {
            properties: {
              title: 'UserMapping',
            },
          },
        }],
      },
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId: config.googleSheets.sheetId,
      range: 'UserMapping!A1:D1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [['Discord ID', 'Discord Username', 'Sheet Column Name', 'Role']],
      },
    });
  }
}
