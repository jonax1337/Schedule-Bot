import cron from 'node-cron';
import { config } from './config.js';
import { postScheduleToChannel } from './bot.js';
import { deleteOldRows } from './sheets.js';

let scheduledTask: cron.ScheduledTask | null = null;
let cleanupTask: cron.ScheduledTask | null = null;

function parseTime(timeStr: string): { hour: number; minute: number } {
  const [hourStr, minuteStr] = timeStr.split(':');
  return {
    hour: parseInt(hourStr, 10),
    minute: parseInt(minuteStr, 10),
  };
}

export function startScheduler(): void {
  const { hour, minute } = parseTime(config.scheduling.dailyPostTime);

  // Cron format: minute hour * * * (every day at specified time)
  const cronExpression = `${minute} ${hour} * * *`;

  console.log(`Setting up daily schedule post at ${config.scheduling.dailyPostTime} (${config.scheduling.timezone})`);
  console.log(`Cron expression: ${cronExpression}`);

  scheduledTask = cron.schedule(
    cronExpression,
    async () => {
      console.log(`[${new Date().toISOString()}] Running scheduled schedule post...`);
      try {
        await postScheduleToChannel();
        console.log('Scheduled post completed successfully.');
      } catch (error) {
        console.error('Error during scheduled post:', error);
      }
    },
    {
      timezone: config.scheduling.timezone,
    }
  );

  console.log('Scheduler started successfully.');

  // Daily cleanup at 00:00 to delete old rows
  console.log('Setting up daily cleanup at 00:00 to remove old rows...');
  
  cleanupTask = cron.schedule(
    '0 0 * * *', // Every day at 00:00
    async () => {
      console.log(`[${new Date().toISOString()}] Running scheduled cleanup...`);
      try {
        const deletedCount = await deleteOldRows();
        console.log(`Cleanup completed. Deleted ${deletedCount} old row(s).`);
      } catch (error) {
        console.error('Error during scheduled cleanup:', error);
      }
    },
    {
      timezone: config.scheduling.timezone,
    }
  );

  console.log('Cleanup scheduler started successfully.');
}

export function stopScheduler(): void {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    console.log('Scheduler stopped.');
  }
  if (cleanupTask) {
    cleanupTask.stop();
    cleanupTask = null;
    console.log('Cleanup scheduler stopped.');
  }
}

export function getNextScheduledTime(): Date | null {
  if (!scheduledTask) return null;

  const { hour, minute } = parseTime(config.scheduling.dailyPostTime);
  const now = new Date();
  const next = new Date(now);

  next.setHours(hour, minute, 0, 0);

  // If the time has already passed today, set it for tomorrow
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }

  return next;
}
