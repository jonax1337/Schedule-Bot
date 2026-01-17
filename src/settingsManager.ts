import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SETTINGS_PATH = resolve(__dirname, '../settings.json');

export interface Settings {
  scheduling: {
    dailyPostTime: string;
    reminderHoursBefore: number;
    trainingStartPollEnabled: boolean;
  };
}

const DEFAULT_SETTINGS: Settings = {
  scheduling: {
    dailyPostTime: '12:00',
    reminderHoursBefore: 3,
    trainingStartPollEnabled: false,
  },
};

let cachedSettings: Settings | null = null;

/**
 * Load settings from settings.json
 */
export function loadSettings(): Settings {
  if (cachedSettings) {
    return cachedSettings;
  }

  try {
    if (!existsSync(SETTINGS_PATH)) {
      // Create default settings file if it doesn't exist
      writeFileSync(SETTINGS_PATH, JSON.stringify(DEFAULT_SETTINGS, null, 2), 'utf-8');
      console.log('Created default settings.json');
      cachedSettings = DEFAULT_SETTINGS;
      return DEFAULT_SETTINGS;
    }

    const fileContent = readFileSync(SETTINGS_PATH, 'utf-8');
    const settings = JSON.parse(fileContent) as Settings;
    
    // Merge with defaults to ensure all properties exist
    cachedSettings = {
      scheduling: {
        ...DEFAULT_SETTINGS.scheduling,
        ...settings.scheduling,
      },
    };

    return cachedSettings;
  } catch (error) {
    console.error('Error loading settings.json, using defaults:', error);
    cachedSettings = DEFAULT_SETTINGS;
    return DEFAULT_SETTINGS;
  }
}

/**
 * Save settings to settings.json
 */
export function saveSettings(settings: Settings): void {
  try {
    writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf-8');
    cachedSettings = settings;
    console.log('Settings saved successfully');
  } catch (error) {
    console.error('Error saving settings.json:', error);
    throw error;
  }
}

/**
 * Update a specific setting
 */
export function updateSetting<K extends keyof Settings>(
  category: K,
  key: keyof Settings[K],
  value: any
): void {
  const settings = loadSettings();
  (settings[category] as any)[key] = value;
  saveSettings(settings);
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
