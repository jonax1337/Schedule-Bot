import { prisma } from '../../repositories/database.repository.js';
import { logger } from './logger.js';

function flattenSettings(settings: Settings): Record<string, string | number | boolean> {
  return {
    'discord.channelId': settings.discord.channelId,
    'discord.pingRoleId': settings.discord.pingRoleId || '',
    'discord.allowDiscordAuth': settings.discord.allowDiscordAuth,
    'scheduling.dailyPostTime': settings.scheduling.dailyPostTime,
    'scheduling.reminderHoursBefore': settings.scheduling.reminderHoursBefore,
    'scheduling.duplicateReminderEnabled': settings.scheduling.duplicateReminderEnabled,
    'scheduling.duplicateReminderHoursBefore': settings.scheduling.duplicateReminderHoursBefore,
    'scheduling.timezone': settings.scheduling.timezone,
    'scheduling.cleanChannelBeforePost': settings.scheduling.cleanChannelBeforePost,
    'scheduling.trainingStartPollEnabled': settings.scheduling.trainingStartPollEnabled,
    'scheduling.pollDurationMinutes': settings.scheduling.pollDurationMinutes,
    'scheduling.changeNotificationsEnabled': settings.scheduling.changeNotificationsEnabled,
    'branding.teamName': settings.branding.teamName,
    'branding.tagline': settings.branding.tagline || DEFAULT_SETTINGS.branding.tagline!,
    'branding.logoUrl': settings.branding.logoUrl || '',
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
    duplicateReminderEnabled: boolean;
    duplicateReminderHoursBefore: number;
    trainingStartPollEnabled: boolean;
    pollDurationMinutes: number;
    timezone: string;
    cleanChannelBeforePost: boolean;
    changeNotificationsEnabled: boolean;
  };
  branding: {
    teamName: string;
    tagline?: string;
    logoUrl?: string;
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
    duplicateReminderEnabled: false,
    duplicateReminderHoursBefore: 1,
    trainingStartPollEnabled: false,
    pollDurationMinutes: 60,
    timezone: 'Europe/Berlin',
    cleanChannelBeforePost: false,
    changeNotificationsEnabled: true,
  },
  branding: {
    teamName: 'Valorant Bot',
    tagline: 'Schedule Manager',
    logoUrl: '',
  },
};

let cachedSettings: Settings | null = null;


/**
 * Load settings from cache, returning defaults if not yet loaded from PostgreSQL
 */
export function loadSettings(): Settings {
  if (cachedSettings) {
    return cachedSettings;
  }

  // Return defaults until loadSettingsAsync() is called during startup
  cachedSettings = { ...DEFAULT_SETTINGS };
  return cachedSettings;
}

/**
 * Load settings from PostgreSQL (async, used during startup and reload)
 */
export async function loadSettingsAsync(): Promise<Settings> {
  try {
    // Settings from PostgreSQL Settings table
    const settingsRecords = await prisma.setting.findMany();

    if (settingsRecords.length === 0) {
      logger.info('No settings found in PostgreSQL, creating defaults');
      const defaultSettings = {
        discord: DEFAULT_SETTINGS.discord,
        scheduling: DEFAULT_SETTINGS.scheduling,
        branding: DEFAULT_SETTINGS.branding,
      };

      // Save default settings to PostgreSQL
      for (const [key, value] of Object.entries(flattenSettings(defaultSettings))) {
        await prisma.setting.upsert({
          where: { key },
          create: { key, value: String(value) },
          update: { value: String(value) },
        });
      }
      logger.success('Default settings created in PostgreSQL');

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
        duplicateReminderEnabled: settingsMap['scheduling.duplicateReminderEnabled'] === 'true',
        duplicateReminderHoursBefore: parseInt(settingsMap['scheduling.duplicateReminderHoursBefore']) || DEFAULT_SETTINGS.scheduling.duplicateReminderHoursBefore,
        trainingStartPollEnabled: settingsMap['scheduling.trainingStartPollEnabled'] === 'true',
        pollDurationMinutes: parseInt(settingsMap['scheduling.pollDurationMinutes']) || DEFAULT_SETTINGS.scheduling.pollDurationMinutes,
        timezone: settingsMap['scheduling.timezone'] || DEFAULT_SETTINGS.scheduling.timezone,
        cleanChannelBeforePost: settingsMap['scheduling.cleanChannelBeforePost'] === 'true',
        changeNotificationsEnabled: settingsMap['scheduling.changeNotificationsEnabled'] !== 'false',
      },
      branding: {
        teamName: settingsMap['branding.teamName'] || DEFAULT_SETTINGS.branding.teamName,
        tagline: settingsMap['branding.tagline'] || DEFAULT_SETTINGS.branding.tagline,
        logoUrl: settingsMap['branding.logoUrl'] || DEFAULT_SETTINGS.branding.logoUrl,
      },
    };
    return cachedSettings;
  } catch (error) {
    logger.error('Error loading settings', error instanceof Error ? error.message : String(error));
    cachedSettings = { ...DEFAULT_SETTINGS };
    return cachedSettings;
  }
}

/**
 * Save settings to PostgreSQL
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
    logger.success('Settings saved');
  } catch (error) {
    logger.error('Error saving settings', error instanceof Error ? error.message : String(error));
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
