import { getSettingsFromSheet, saveSettingsToSheet, type SheetSettings } from './database/schedules.js';

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
    changeNotificationsEnabled: boolean;
  };
}

const DEFAULT_SETTINGS: Settings = {
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
    changeNotificationsEnabled: true,
  },
};

let cachedSettings: Settings | null = null;


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
  console.log('Using default settings. Call loadSettingsAsync() to load from PostgreSQL.');
  cachedSettings = { ...DEFAULT_SETTINGS };
  return cachedSettings;
}

/**
 * Async version of loadSettings that reads from Google Sheets
 */
export async function loadSettingsAsync(): Promise<Settings> {
  try {
    const sheetSettings = await getSettingsFromSheet();
    
    if (sheetSettings) {
      cachedSettings = {
        ...sheetSettings,
        scheduling: {
          ...sheetSettings.scheduling,
          changeNotificationsEnabled: sheetSettings.scheduling.changeNotificationsEnabled ?? true,
        },
      };
      console.log('✅ Settings loaded from PostgreSQL');
      return cachedSettings;
    }

    console.log('No settings found in PostgreSQL. Creating default settings...');
    const defaultSettings = {
      discord: DEFAULT_SETTINGS.discord,
      scheduling: DEFAULT_SETTINGS.scheduling,
    };
    
    await saveSettingsToSheet(defaultSettings);
    console.log('✅ Default settings created in PostgreSQL');
    
    cachedSettings = { ...defaultSettings };
    return cachedSettings;
  } catch (error) {
    console.error('Error loading settings:', error);
    cachedSettings = { ...DEFAULT_SETTINGS };
    return cachedSettings;
  }
}

/**
 * Save settings to Google Sheets (does not save admin credentials)
 */
export async function saveSettings(settings: Settings): Promise<void> {
  try {
    await saveSettingsToSheet({
      discord: settings.discord,
      scheduling: settings.scheduling,
    });
    
    cachedSettings = { ...settings };
    console.log('Settings saved to PostgreSQL successfully');
  } catch (error) {
    console.error('Error saving settings:', error);
    throw error;
  }
}

/**
 * Update a specific setting
 */
export async function updateSetting<K extends keyof Settings>(
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
