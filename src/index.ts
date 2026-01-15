import { startBot, client } from './bot.js';
import { startScheduler, stopScheduler, getNextScheduledTime } from './scheduler.js';
import { testConnection, deleteOldRows } from './sheets.js';
import { config } from './config.js';

async function main(): Promise<void> {
  console.log('='.repeat(50));
  console.log('Valorant Schedule Bot');
  console.log('='.repeat(50));

  // Test Google Sheets connection
  console.log('\nTesting Google Sheets connection...');
  const sheetsConnected = await testConnection();
  if (!sheetsConnected) {
    console.error('Failed to connect to Google Sheets. Please check your credentials.');
    process.exit(1);
  }
  console.log('Google Sheets connection successful!');

  // Run cleanup job on startup
  console.log('\nRunning table cleanup and maintenance...');
  try {
    await deleteOldRows();
    console.log('Table cleanup completed successfully!');
  } catch (error) {
    console.error('Error during table cleanup:', error);
    // Don't exit, just log the error
  }

  // Start Discord bot
  console.log('\nStarting Discord bot...');
  await startBot();

  // Wait for bot to be ready before starting scheduler
  client.once('ready', () => {
    console.log('\nStarting scheduler...');
    startScheduler();

    const nextRun = getNextScheduledTime();
    if (nextRun) {
      console.log(`Next scheduled post: ${nextRun.toLocaleString('de-DE')}`);
    }

    console.log('\n' + '='.repeat(50));
    console.log('Bot is running!');
    console.log(`Daily post time: ${config.scheduling.dailyPostTime}`);
    console.log(`Timezone: ${config.scheduling.timezone}`);
    console.log('Use /schedule in Discord to manually check availability');
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
