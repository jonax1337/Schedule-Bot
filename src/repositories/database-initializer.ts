import { prisma } from './database.repository.js';
import { logger } from '../shared/utils/logger.js';

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
};

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
      players: [],
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
  
  const isEmpty = await isDatabaseEmpty();
  
  if (!isEmpty) {
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

/**
 * Get database statistics
 */
export async function getDatabaseStats(): Promise<{
  settings: number;
  schedules: number;
  userMappings: number;
  scrims: number;
}> {
  try {
    const [settings, schedules, userMappings, scrims] = await Promise.all([
      prisma.setting.count(),
      prisma.schedule.count(),
      prisma.userMapping.count(),
      prisma.scrim.count(),
    ]);
    
    return { settings, schedules, userMappings, scrims };
  } catch (error) {
    console.error('Error getting database stats:', error);
    return { settings: 0, schedules: 0, userMappings: 0, scrims: 0 };
  }
}
