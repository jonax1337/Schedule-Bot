import { startBot, client } from './bot/client.js';
import { startScheduler, stopScheduler, getNextScheduledTime } from './jobs/scheduler.js';
import { connectDatabase } from './repositories/database.repository.js';
import { deleteOldRows } from './repositories/schedule.repository.js';
import { config, reloadConfig } from './shared/config/config.js';
import { startApiServer } from './api/server.js';
import { logger } from './shared/utils/logger.js';

async function main(): Promise<void> {
  console.log('='.repeat(50));
  console.log('Valorant Schedule Bot');
  console.log('='.repeat(50));

  // Connect to PostgreSQL Database
  console.log('\nConnecting to PostgreSQL database...');
  logger.info('Connecting to PostgreSQL database');
  
  try {
    await connectDatabase();
    console.log('PostgreSQL connection successful!');
    logger.success('PostgreSQL connected');
  } catch (error) {
    console.error('Failed to connect to PostgreSQL. Exiting...', error);
    logger.error('PostgreSQL connection failed', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  // Load/migrate settings
  console.log('\nLoading settings...');
  try {
    await reloadConfig();
    console.log('Settings loaded successfully!');
    console.log(`Daily post time: ${config.scheduling.dailyPostTime}`);
    console.log(`Timezone: ${config.scheduling.timezone}`);
    logger.success('Settings loaded');
  } catch (error) {
    console.error('Error loading settings:', error);
    logger.error('Settings load failed', error instanceof Error ? error.message : String(error));
  }

  // Cleanup job DISABLED - keeping all historical data
  console.log('\nSchedule data cleanup disabled - all historical data will be preserved.');

  // Ensure next 14 days have schedule entries
  console.log('\nEnsuring schedule entries for next 14 days...');
  try {
    const { addMissingDays } = await import('./repositories/schedule.repository.js');
    await addMissingDays();
    console.log('Schedule entries verified successfully!');
    logger.success('Schedule entries verified');
  } catch (error) {
    console.error('Error ensuring schedule entries:', error);
    logger.error('Schedule verification failed', error instanceof Error ? error.message : String(error));
  }

  logger.info('Starting Discord bot');
  await startBot();

  // Wait for bot to be ready before starting scheduler
  client.once('clientReady', () => {
    logger.success('Discord bot ready', `Logged in as ${client.user?.tag}`);
    
    console.log('\nStarting scheduler...');
    logger.info('Starting scheduler');
    startScheduler();

    const nextRun = getNextScheduledTime();
    if (nextRun) {
      console.log(`Next scheduled post: ${nextRun.toLocaleString('de-DE')}`);
      logger.info('Next scheduled post', nextRun.toLocaleString('de-DE'));
    }

    console.log('\nStarting API server...');
    logger.info('Starting API server');
    startApiServer();

    console.log('\n' + '='.repeat(50));
    console.log('Bot is running!');
    console.log('Use /schedule in Discord to manually check availability');
    console.log('Dashboard API: http://localhost:3001');
    console.log('='.repeat(50));
  });
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  stopScheduler();
  client.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down...');
  stopScheduler();
  client.destroy();
  process.exit(0);
});

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
