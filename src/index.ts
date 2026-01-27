import { startBot, client } from './bot/client.js';
import { startScheduler, stopScheduler, getNextScheduledTime } from './jobs/scheduler.js';
import { connectDatabase } from './repositories/database.repository.js';
import { config, reloadConfig } from './shared/config/config.js';
import { startApiServer } from './api/server.js';
import { logger } from './shared/utils/logger.js';

async function main(): Promise<void> {
  logger.info('Valorant Schedule Bot starting');

  // Connect to PostgreSQL Database
  try {
    await connectDatabase();
  } catch (error) {
    logger.error('PostgreSQL connection failed', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  // Initialize database if empty
  try {
    const { initializeDatabaseIfEmpty } = await import('./repositories/database-initializer.js');
    await initializeDatabaseIfEmpty();
  } catch (error) {
    logger.error('Database initialization failed', error instanceof Error ? error.message : String(error));
  }

  // Load settings from PostgreSQL
  try {
    await reloadConfig();
    logger.success('Settings loaded', `Post time: ${config.scheduling.dailyPostTime}, Timezone: ${config.scheduling.timezone}`);
  } catch (error) {
    logger.error('Settings load failed', error instanceof Error ? error.message : String(error));
  }

  // Ensure next 14 days have schedule entries
  try {
    const { addMissingDays } = await import('./repositories/schedule.repository.js');
    await addMissingDays();
  } catch (error) {
    logger.error('Schedule verification failed', error instanceof Error ? error.message : String(error));
  }

  logger.info('Starting Discord bot');
  await startBot();

  // Wait for bot to be ready before starting scheduler
  client.once('clientReady', () => {
    logger.success('Discord bot ready', `Logged in as ${client.user?.tag}`);

    startScheduler();

    const nextRun = getNextScheduledTime();
    if (nextRun) {
      logger.info('Next scheduled post', nextRun.toLocaleString('de-DE'));
    }

    startApiServer();
    logger.success('Startup complete');
  });
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('Shutting down (SIGINT)');
  stopScheduler();
  client.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Shutting down (SIGTERM)');
  stopScheduler();
  client.destroy();
  process.exit(0);
});

main().catch(error => {
  logger.error('Fatal error', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
