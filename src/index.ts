import { startBot, client } from './bot.js';
import { startScheduler, stopScheduler, getNextScheduledTime } from './scheduler.js';
import { testConnection, deleteOldRows } from './sheets.js';
import { config, reloadConfig } from './config.js';
import { startApiServer } from './apiServer.js';
import { logger } from './logger.js';

async function main(): Promise<void> {
  console.log('='.repeat(50));
  console.log('Valorant Schedule Bot');
  console.log('='.repeat(50));

  // Test Google Sheets connection
  console.log('\nTesting Google Sheets connection...');
  logger.info('Testing Google Sheets connection');
  const sheetsConnected = await testConnection();
  if (!sheetsConnected) {
    console.error('Failed to connect to Google Sheets. Please check your credentials.');
    logger.error('Google Sheets connection failed', 'Check credentials.json');
    process.exit(1);
  }
  console.log('Google Sheets connection successful!');
  logger.success('Google Sheets connected');

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

  // Run cleanup job on startup
  console.log('\nRunning table cleanup and maintenance...');
  try {
    await deleteOldRows();
    console.log('Table cleanup completed successfully!');
  } catch (error) {
    console.error('Error during table cleanup:', error);
    // Don't exit, just log the error
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
