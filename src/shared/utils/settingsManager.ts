import { prisma } from '../../repositories/database.repository.js';
import { requireOrgId } from '../tenancy/orgContext.js';
import { logger, getErrorMessage } from './logger.js';

function parseWeeklyPingDays(raw: string | undefined): number[] {
  if (raw === undefined) return [...DEFAULT_SETTINGS.scheduling.weeklyPingDays];
  if (raw === '') return [];
  return raw
    .split(',')
    .map(s => parseInt(s.trim(), 10))
    .filter(n => Number.isInteger(n) && n >= 0 && n <= 6);
}

function flattenSettings(settings: Settings): Record<string, string | number | boolean> {
  return {
    'discord.channelId': settings.discord.channelId,
    'discord.pingRoleId': settings.discord.pingRoleId || '',
    'discord.allowDiscordAuth': settings.discord.allowDiscordAuth,
    'discord.pinnedWeekMessageId': settings.discord.pinnedWeekMessageId || '',
    'discord.pinnedWeekStartDate': settings.discord.pinnedWeekStartDate || '',
    'scheduling.dailyPostTime': settings.scheduling.dailyPostTime,
    'scheduling.reminderHoursBefore': settings.scheduling.reminderHoursBefore,
    'scheduling.duplicateReminderEnabled': settings.scheduling.duplicateReminderEnabled,
    'scheduling.duplicateReminderHoursBefore': settings.scheduling.duplicateReminderHoursBefore,
    'scheduling.timezone': settings.scheduling.timezone,
    'scheduling.cleanChannelBeforePost': settings.scheduling.cleanChannelBeforePost,
    'scheduling.trainingStartPollEnabled': settings.scheduling.trainingStartPollEnabled,
    'scheduling.pollDurationMinutes': settings.scheduling.pollDurationMinutes,
    'scheduling.changeNotificationsEnabled': settings.scheduling.changeNotificationsEnabled,
    'scheduling.weeklyPingEnabled': settings.scheduling.weeklyPingEnabled,
    'scheduling.weeklyPingTime': settings.scheduling.weeklyPingTime,
    'scheduling.weeklyPingDays': settings.scheduling.weeklyPingDays.join(','),
    'branding.teamName': settings.branding.teamName,
    'branding.logoUrl': settings.branding.logoUrl,
    'stratbook.editPermission': settings.stratbook.editPermission,
  };
}

export interface Settings {
  discord: {
    channelId: string;
    pingRoleId: string | null;
    allowDiscordAuth: boolean;
    pinnedWeekMessageId: string | null;
    pinnedWeekStartDate: string | null;
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
    weeklyPingEnabled: boolean;
    weeklyPingTime: string;
    weeklyPingDays: number[];
  };
  branding: {
    teamName: string;
    logoUrl: string;
  };
  stratbook: {
    editPermission: 'admin' | 'all';
  };
}

const DEFAULT_SETTINGS: Settings = {
  discord: {
    channelId: '',
    pingRoleId: null,
    allowDiscordAuth: false,
    pinnedWeekMessageId: null,
    pinnedWeekStartDate: null,
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
    weeklyPingEnabled: true,
    weeklyPingTime: '12:00',
    weeklyPingDays: [0, 1],
  },
  branding: {
    teamName: 'Our Team',
    logoUrl: '',
  },
  stratbook: {
    editPermission: 'admin',
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

/** Build a Settings object from flat key→value records. */
function parseSettingsMap(settingsMap: Record<string, string>): Settings {
  return {
    discord: {
      channelId: settingsMap['discord.channelId'] || DEFAULT_SETTINGS.discord.channelId,
      pingRoleId: settingsMap['discord.pingRoleId'] || DEFAULT_SETTINGS.discord.pingRoleId,
      allowDiscordAuth: settingsMap['discord.allowDiscordAuth'] === 'true',
      pinnedWeekMessageId: settingsMap['discord.pinnedWeekMessageId'] || null,
      pinnedWeekStartDate: settingsMap['discord.pinnedWeekStartDate'] || null,
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
      weeklyPingEnabled: settingsMap['scheduling.weeklyPingEnabled'] !== 'false',
      weeklyPingTime: settingsMap['scheduling.weeklyPingTime'] || DEFAULT_SETTINGS.scheduling.weeklyPingTime,
      weeklyPingDays: parseWeeklyPingDays(settingsMap['scheduling.weeklyPingDays']),
    },
    branding: {
      teamName: settingsMap['branding.teamName'] || DEFAULT_SETTINGS.branding.teamName,
      logoUrl: settingsMap['branding.logoUrl'] || DEFAULT_SETTINGS.branding.logoUrl,
    },
    stratbook: {
      editPermission: (settingsMap['stratbook.editPermission'] === 'all' ? 'all' : 'admin') as 'admin' | 'all',
    },
  };
}

// Setting is a tenant model: scoped + stamped from the active org context.
// upsert isn't supported on tenant models (composite [org, key]) → find-then-write.
async function writeSetting(key: string, value: string): Promise<void> {
  const existing = await prisma.setting.findFirst({ where: { key } });
  if (existing) {
    await prisma.setting.update({ where: { id: existing.id }, data: { value } });
  } else {
    await prisma.setting.create({ data: { key, value, organizationId: requireOrgId() } });
  }
}

async function writeAllSettings(settings: Settings): Promise<void> {
  for (const [key, value] of Object.entries(flattenSettings(settings))) {
    await writeSetting(key, String(value));
  }
}

async function readSettingsMap(): Promise<Record<string, string>> {
  const records = await prisma.setting.findMany();
  const map: Record<string, string> = {};
  for (const r of records) map[r.key] = r.value;
  return map;
}

/**
 * Settings for the org in the CURRENT context (request/bot) — per-org, no global
 * cache. Returns defaults if the org has none yet.
 */
export async function getSettingsForCurrentOrg(): Promise<Settings> {
  const map = await readSettingsMap();
  return Object.keys(map).length === 0 ? { ...DEFAULT_SETTINGS } : parseSettingsMap(map);
}

/** Persist settings for the org in the CURRENT context — per-org, no global cache. */
export async function saveSettingsForCurrentOrg(settings: Settings): Promise<void> {
  await writeAllSettings(settings);
}

/**
 * Load settings for the DEFAULT (bot) org into the global cache. Used at startup
 * / reloadConfig — must run inside the default org context.
 */
export async function loadSettingsAsync(): Promise<Settings> {
  try {
    const map = await readSettingsMap();
    if (Object.keys(map).length === 0) {
      logger.info('No settings found in PostgreSQL, creating defaults');
      await writeAllSettings(DEFAULT_SETTINGS);
      cachedSettings = { ...DEFAULT_SETTINGS };
      return cachedSettings;
    }
    cachedSettings = parseSettingsMap(map);
    return cachedSettings;
  } catch (error) {
    logger.error('Error loading settings', getErrorMessage(error));
    cachedSettings = { ...DEFAULT_SETTINGS };
    return cachedSettings;
  }
}

/**
 * Save settings for the DEFAULT (bot) org and refresh the global cache.
 * (Per-org dashboard writes use saveSettingsForCurrentOrg instead.)
 */
export async function saveSettings(settings: Settings): Promise<void> {
  try {
    await writeAllSettings(settings);
    cachedSettings = { ...settings };
    logger.success('Settings saved');
  } catch (error) {
    logger.error('Error saving settings', getErrorMessage(error));
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
