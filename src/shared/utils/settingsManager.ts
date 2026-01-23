import { prisma } from '../../repositories/database.repository.js';

function flattenSettings(settings: Settings): Record<string, string | number | boolean> {
  return {
    'discord.channelId': settings.discord.channelId,
    'discord.pingRoleId': settings.discord.pingRoleId || '',
    'discord.allowDiscordAuth': settings.discord.allowDiscordAuth,
    'scheduling.dailyPostTime': settings.scheduling.dailyPostTime,
    'scheduling.reminderHoursBefore': settings.scheduling.reminderHoursBefore,
    'scheduling.timezone': settings.scheduling.timezone,
    'scheduling.cleanChannelBeforePost': settings.scheduling.cleanChannelBeforePost,
    'scheduling.trainingStartPollEnabled': settings.scheduling.trainingStartPollEnabled,
  };
}

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
    // Settings from PostgreSQL Settings table
    const settingsRecords = await prisma.setting.findMany();
    
    if (settingsRecords.length === 0) {
      console.log('No settings found in PostgreSQL. Creating default settings...');
      const defaultSettings = {
        discord: DEFAULT_SETTINGS.discord,
        scheduling: DEFAULT_SETTINGS.scheduling,
      };
      
      // Save default settings to PostgreSQL
      for (const [key, value] of Object.entries(flattenSettings(defaultSettings))) {
        await prisma.setting.upsert({
          where: { key },
          create: { key, value: String(value) },
          update: { value: String(value) },
        });
      }
      console.log('✅ Default settings created in PostgreSQL');
      
      cachedSettings = { ...defaultSettings };
      return cachedSettings;
    }
    
    // Parse settings from flat key-value pairs
    const settingsMap: Record<string, string> = {};
    for (const record of settingsRecords) {
      settingsMap[record.key] = record.value;
    }
    
    cachedSettings = {
      discord: {
        channelId: settingsMap['discord.channelId'] || DEFAULT_SETTINGS.discord.channelId,
        pingRoleId: settingsMap['discord.pingRoleId'] || DEFAULT_SETTINGS.discord.pingRoleId,
        allowDiscordAuth: settingsMap['discord.allowDiscordAuth'] === 'true',
      },
      scheduling: {
        dailyPostTime: settingsMap['scheduling.dailyPostTime'] || DEFAULT_SETTINGS.scheduling.dailyPostTime,
        reminderHoursBefore: parseInt(settingsMap['scheduling.reminderHoursBefore']) || DEFAULT_SETTINGS.scheduling.reminderHoursBefore,
        trainingStartPollEnabled: settingsMap['scheduling.trainingStartPollEnabled'] === 'true',
        timezone: settingsMap['scheduling.timezone'] || DEFAULT_SETTINGS.scheduling.timezone,
        cleanChannelBeforePost: settingsMap['scheduling.cleanChannelBeforePost'] === 'true',
        changeNotificationsEnabled: settingsMap['scheduling.changeNotificationsEnabled'] !== 'false',
      },
    };
    
    console.log('✅ Settings loaded from PostgreSQL');
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
    // Save settings to PostgreSQL
    const flatSettings = flattenSettings(settings);
    for (const [key, value] of Object.entries(flatSettings)) {
      await prisma.setting.upsert({
        where: { key },
        create: { key, value: String(value) },
        update: { value: String(value) },
      });
    }
    
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
