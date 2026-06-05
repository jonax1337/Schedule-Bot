import { prisma } from './database.repository.js';
import { requireOrgId } from '../shared/tenancy/orgContext.js';
import { logger, getErrorMessage } from '../shared/utils/logger.js';
import { formatDateToDDMMYYYY } from '../shared/utils/dateFormatter.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Default settings for a fresh database
 */
const DEFAULT_SETTINGS = {
  'discord.channelId': '',
  'discord.pingRoleId': '',
  'discord.allowDiscordAuth': false,
  'discord.pinnedWeekMessageId': '',
  'discord.pinnedWeekStartDate': '',
  'scheduling.dailyPostTime': '18:00',
  'scheduling.reminderHoursBefore': 2,
  'scheduling.duplicateReminderEnabled': false,
  'scheduling.duplicateReminderHoursBefore': 1,
  'scheduling.timezone': 'Europe/Berlin',
  'scheduling.cleanChannelBeforePost': false,
  'scheduling.trainingStartPollEnabled': false,
  'scheduling.weeklyPingEnabled': true,
  'scheduling.weeklyPingTime': '12:00',
  'scheduling.weeklyPingDays': '0,1',
  'branding.teamName': 'Our Team',
};

/**
 * Check if database tables exist
 */
async function checkTablesExist(): Promise<boolean> {
  try {
    // Try to query the settings table
    await prisma.setting.count();
    return true;
  } catch (error: any) {
    // P2021 = table does not exist
    if (error.code === 'P2021') {
      return false;
    }
    throw error;
  }
}

/**
 * Check for missing tables and sync schema if needed.
 * This handles the case where the database already has data
 * but is missing newly added tables (e.g. absences).
 */
async function checkForMissingTables(): Promise<void> {
  const tablesToCheck = [
    { name: 'absences', check: () => prisma.absence.count() },
  ];

  const missingTables: string[] = [];

  for (const table of tablesToCheck) {
    try {
      await table.check();
    } catch (error: any) {
      if (error.code === 'P2021') {
        missingTables.push(table.name);
      }
    }
  }

  if (missingTables.length > 0) {
    logger.warn('Missing tables detected', missingTables.join(', '));
    await createDatabaseTables();
    logger.success('Database schema synced', `Created missing tables: ${missingTables.join(', ')}`);
  }
}

/**
 * Create database tables using Prisma
 */
async function createDatabaseTables(): Promise<void> {
  logger.info('Creating database tables with Prisma');

  try {
    const { stdout, stderr } = await execAsync('npx prisma db push --skip-generate --accept-data-loss');

    if (stderr && !stderr.includes('warn')) {
      logger.warn('Prisma db push stderr', stderr);
    }

    logger.success('Database tables created');
  } catch (error: any) {
    logger.error('Failed to create database tables', error.message);
    throw new Error('Database table creation failed. Please run "npx prisma db push" manually.');
  }
}

/**
 * Check if the database is empty (no settings exist)
 */
async function isDatabaseEmpty(): Promise<boolean> {
  try {
    const settingsCount = await prisma.setting.count();
    return settingsCount === 0;
  } catch (error) {
    logger.error('Error checking database status', getErrorMessage(error));
    return false;
  }
}

/**
 * Initialize database with default settings
 */
async function initializeDefaultSettings(): Promise<void> {
  logger.info('Creating default settings');

  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    try {
      // Setting is tenant-scoped (composite [org, key]); find-then-write, stamping
      // the org from the active context (startup runs in the default org).
      const existing = await prisma.setting.findFirst({ where: { key } });
      if (!existing) {
        await prisma.setting.create({ data: { key, value: String(value), organizationId: requireOrgId() } });
      }
    } catch (error) {
      logger.error(`Failed to create setting: ${key}`, getErrorMessage(error));
    }
  }

  logger.success('Default settings created');
}

/**
 * Create initial schedule entries for the next 14 days
 */
async function initializeScheduleEntries(): Promise<void> {
  logger.info('Creating schedule entries for next 14 days');

  const today = new Date();
  const entries: { date: string; reason: string; focus: string }[] = [];

  for (let i = 0; i < 14; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);

    const dateStr = formatDateToDDMMYYYY(date);

    entries.push({
      date: dateStr,
      reason: '',
      focus: '',
    });
  }

  try {
    for (const entry of entries) {
      const existing = await prisma.schedule.findFirst({ where: { date: entry.date } });
      if (!existing) {
        await prisma.schedule.create({ data: { ...entry, organizationId: requireOrgId() } });
      }
    }
    logger.success('Schedule entries created', `${entries.length} entries`);
  } catch (error) {
    logger.error('Error creating schedule entries', getErrorMessage(error));
  }
}

/**
 * Seed a freshly created organization with default settings and an initial
 * 14-day schedule window so its dashboard isn't empty on first open.
 *
 * Must be called INSIDE the org's context (runWithOrg), since the underlying
 * writes are tenant-scoped via the Prisma guard. Idempotent: only creates rows
 * that are missing for the active org.
 */
export async function initializeOrganizationDefaults(): Promise<void> {
  await initializeDefaultSettings();
  await initializeScheduleEntries();
}

/**
 * Initialize the database with default data if it's empty
 */
export async function initializeDatabaseIfEmpty(): Promise<void> {
  logger.info('Checking database status');

  // First, check if tables exist
  const tablesExist = await checkTablesExist();

  if (!tablesExist) {
    logger.warn('Database tables do not exist, creating schema');

    try {
      await createDatabaseTables();
    } catch (error) {
      logger.error('Failed to create database tables', getErrorMessage(error));
      throw error;
    }
  }

  // Now check if database is empty
  const isEmpty = await isDatabaseEmpty();

  if (!isEmpty) {
    // Check for missing tables (schema drift) even when DB has data
    await checkForMissingTables();
    logger.info('Database already initialized');
    return;
  }

  logger.warn('Empty database detected, initializing with defaults');

  try {
    await initializeDefaultSettings();
    await initializeScheduleEntries();

    logger.success('Database initialized', 'Default settings and schedule entries created');
    logger.info('Configure discord.channelId and register users via /register command');
  } catch (error) {
    logger.error('Database initialization failed', getErrorMessage(error));
    throw error;
  }
}
