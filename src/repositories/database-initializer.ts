import { prisma } from './database.repository.js';
import { logger } from '../shared/utils/logger.js';
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
  'scheduling.dailyPostTime': '18:00',
  'scheduling.reminderHoursBefore': 2,
  'scheduling.timezone': 'Europe/Berlin',
  'scheduling.cleanChannelBeforePost': false,
  'scheduling.trainingStartPollEnabled': false,
  'branding.teamName': 'Valorant Bot',
  'branding.tagline': 'Schedule Manager',
  'branding.logoUrl': '',
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
    console.log(`⚠️  Missing tables detected: ${missingTables.join(', ')}`);
    console.log('🔄 Syncing database schema...');
    await createDatabaseTables();
    console.log('✅ Missing tables created successfully!');
    logger.success('Database schema synced', `Created missing tables: ${missingTables.join(', ')}`);
  }
}

/**
 * Create database tables using Prisma
 */
async function createDatabaseTables(): Promise<void> {
  console.log('📦 Creating database tables with Prisma...');
  
  try {
    // Use Prisma's db push to create tables
    console.log('   Running: prisma db push --skip-generate');
    const { stdout, stderr } = await execAsync('npx prisma db push --skip-generate --accept-data-loss');
    
    if (stdout) console.log(stdout);
    if (stderr && !stderr.includes('warn')) console.error(stderr);
    
    console.log('✅ Database tables created successfully!');
  } catch (error: any) {
    console.error('❌ Failed to create database tables:', error.message);
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
    console.error('Error checking database status:', error);
    return false;
  }
}

/**
 * Initialize database with default settings
 */
async function initializeDefaultSettings(): Promise<void> {
  console.log('📝 Creating default settings...');
  
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    try {
      await prisma.setting.upsert({
        where: { key },
        update: {},
        create: {
          key,
          value: String(value),
        },
      });
      console.log(`  ✓ Created setting: ${key}`);
    } catch (error) {
      console.error(`  ✗ Failed to create setting ${key}:`, error);
    }
  }
  
  console.log('✅ Default settings created successfully!');
}

/**
 * Create initial schedule entries for the next 14 days
 */
async function initializeScheduleEntries(): Promise<void> {
  console.log('📅 Creating schedule entries for next 14 days...');
  
  const today = new Date();
  const entries = [];
  
  for (let i = 0; i < 14; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const dateStr = `${day}.${month}.${year}`;
    
    entries.push({
      date: dateStr,
      reason: '',
      focus: '',
    });
  }
  
  try {
    for (const entry of entries) {
      await prisma.schedule.upsert({
        where: { date: entry.date },
        update: {},
        create: entry,
      });
    }
    console.log(`✅ Created ${entries.length} schedule entries!`);
  } catch (error) {
    console.error('Error creating schedule entries:', error);
  }
}

/**
 * Initialize the database with default data if it's empty
 */
export async function initializeDatabaseIfEmpty(): Promise<void> {
  console.log('\n' + '='.repeat(50));
  console.log('🔍 Checking database status...');
  console.log('='.repeat(50));
  
  // First, check if tables exist
  const tablesExist = await checkTablesExist();
  
  if (!tablesExist) {
    console.log('⚠️  Database tables do not exist!');
    console.log('🚀 Creating database schema with Prisma...\n');
    
    try {
      await createDatabaseTables();
    } catch (error) {
      console.error('Failed to create database tables:', error);
      throw error;
    }
  }
  
  // Now check if database is empty
  const isEmpty = await isDatabaseEmpty();
  
  if (!isEmpty) {
    // Check for missing tables (schema drift) even when DB has data
    await checkForMissingTables();
    console.log('✅ Database already initialized. Skipping setup.');
    console.log('='.repeat(50) + '\n');
    return;
  }
  
  console.log('⚠️  Empty database detected!');
  console.log('🚀 Initializing database with default data...\n');
  
  try {
    // Initialize settings
    await initializeDefaultSettings();
    
    // Initialize schedule entries
    await initializeScheduleEntries();
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ Database initialization completed successfully!');
    console.log('='.repeat(50));
    console.log('\n⚠️  IMPORTANT: Please configure the following settings:');
    console.log('   1. discord.channelId - Your Discord channel ID');
    console.log('   2. discord.pingRoleId - Role ID to ping (optional)');
    console.log('   3. Register users with /register command');
    console.log('\n   You can update settings via the dashboard or API.');
    console.log('='.repeat(50) + '\n');
    
    logger.success('Database initialized', 'Default settings and schedule entries created');
  } catch (error) {
    console.error('\n❌ Database initialization failed:', error);
    logger.error('Database initialization failed', error instanceof Error ? error.message : String(error));
    throw error;
  }
}

