import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getSettingsFromSheet, saveSettingsToSheet, type SheetSettings } from './sheets.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SETTINGS_PATH = resolve(__dirname, '../settings.json');

export interface Settings {
  discord: {
    channelId: string;
    pingRoleId: string | null;
    allowDiscordAuth: boolean;
  };
  scheduling: {
    dailyPostTime: string;
    reminderHoursBefore: number;
    trainingStartPollEnabled: boolean;
    timezone: string;
    cleanChannelBeforePost: boolean;
  };
  admin: {
    username: string;
    password: string;
  };
}

const DEFAULT_SETTINGS: Omit<Settings, 'admin'> = {
  discord: {
    channelId: '',
    pingRoleId: null,
    allowDiscordAuth: false,
  },
  scheduling: {
    dailyPostTime: '12:00',
    reminderHoursBefore: 3,
    trainingStartPollEnabled: false,
    timezone: 'Europe/Berlin',
    cleanChannelBeforePost: false,
  },
};

let cachedSettings: Settings | null = null;

/**
 * Get admin credentials from environment variables
 */
function getAdminCredentials(): { username: string; password: string } {
  return {
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD || 'admin123',
  };
}

/**
 * Load settings from Google Sheets (with fallback to settings.json for migration)
 */
export function loadSettings(): Settings {
  if (cachedSettings) {
    return cachedSettings;
  }

  return reloadSettings();
}

/**
 * Force reload settings from Google Sheets (bypasses cache)
 */
export function reloadSettings(): Settings {
  try {
    // Admin credentials always come from .env
    const admin = getAdminCredentials();

    // Use defaults (settings should be loaded via async version)
    console.log('Using default settings. Call loadSettingsAsync() to load from Google Sheets.');
    cachedSettings = {
      ...DEFAULT_SETTINGS,
      admin,
    };

    return cachedSettings;
  } catch (error) {
    console.error('Error loading settings, using defaults:', error);
    const admin = getAdminCredentials();
    cachedSettings = {
      ...DEFAULT_SETTINGS,
      admin,
    };
    return cachedSettings;
  }
}

/**
 * Async version of loadSettings that reads from Google Sheets
 */
export async function loadSettingsAsync(): Promise<Settings> {
  try {
    const admin = getAdminCredentials();
    
    // Try to get settings from Google Sheet
    const sheetSettings = await getSettingsFromSheet();
    
    if (sheetSettings) {
      cachedSettings = {
        ...sheetSettings,
        admin, // Always from .env
      };
      console.log('✅ Settings loaded from Google Sheets');
      return cachedSettings;
    }

    // No settings in Google Sheet - create defaults
    console.log('No settings found in Google Sheets. Creating default settings...');
    const defaultSettings = {
      discord: DEFAULT_SETTINGS.discord,
      scheduling: DEFAULT_SETTINGS.scheduling,
    };
    
    // Save defaults to Google Sheet
    await saveSettingsToSheet(defaultSettings);
    console.log('✅ Default settings created in Google Sheets');
    
    cachedSettings = {
      ...defaultSettings,
      admin,
    };
    
    return cachedSettings;
  } catch (error) {
    console.error('Error loading settings async:', error);
    const admin = getAdminCredentials();
    cachedSettings = {
      ...DEFAULT_SETTINGS,
      admin,
    };
    return cachedSettings;
  }
}

/**
 * Save settings to Google Sheets (does not save admin credentials)
 */
export async function saveSettings(settings: Settings): Promise<void> {
  try {
    // Only save discord and scheduling to Google Sheets
    // Admin credentials are not saved (they come from .env)
    await saveSettingsToSheet({
      discord: settings.discord,
      scheduling: settings.scheduling,
    });
    
    // Update cache with new settings + current admin from .env
    cachedSettings = {
      ...settings,
      admin: getAdminCredentials(),
    };
    
    console.log('Settings saved to Google Sheets successfully');
  } catch (error) {
    console.error('Error saving settings:', error);
    throw error;
  }
}

/**
 * Update a specific setting
 */
export async function updateSetting<K extends keyof Omit<Settings, 'admin'>>(
  category: K,
  key: keyof Settings[K],
  value: any
): Promise<void> {
  const settings = await loadSettingsAsync();
  (settings[category] as any)[key] = value;
  await saveSettings(settings);
}

/**
 * Get a specific setting
 */
export function getSetting<K extends keyof Settings>(
  category: K,
  key: keyof Settings[K]
): any {
  const settings = loadSettings();
  return settings[category][key];
}
