import cron from 'node-cron';
import { config } from './config.js';
import { postScheduleToChannel, client } from './bot.js';
import { deleteOldRows } from './database/schedules.js';
import { sendRemindersToUsersWithoutEntry } from './reminder.js';
import { processAbsencesForNext14Days } from './absenceProcessor.js';

let scheduledTask: cron.ScheduledTask | null = null;
let cleanupTask: cron.ScheduledTask | null = null;
let reminderTask: cron.ScheduledTask | null = null;
let absenceTask: cron.ScheduledTask | null = null;

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

  // Reminder job X hours before daily post
  const reminderTime = calculateReminderTime(hour, minute, config.scheduling.reminderHoursBefore);
  const reminderCronExpression = `${reminderTime.minute} ${reminderTime.hour} * * *`;

  console.log(`Setting up daily reminder at ${reminderTime.hour}:${String(reminderTime.minute).padStart(2, '0')} (${config.scheduling.reminderHoursBefore}h before post)`);
  console.log(`Reminder cron expression: ${reminderCronExpression}`);

  reminderTask = cron.schedule(
    reminderCronExpression,
    async () => {
      console.log(`[${new Date().toISOString()}] Running scheduled reminders...`);
      try {
        await sendRemindersToUsersWithoutEntry(client);
        console.log('Reminders sent successfully.');
      } catch (error) {
        console.error('Error during scheduled reminders:', error);
      }
    },
    {
      timezone: config.scheduling.timezone,
    }
  );

  console.log('Reminder scheduler started successfully.');

  // Absence processing job - runs every hour to mark absences
  console.log('Setting up absence processing job (runs every hour)...');
  
  absenceTask = cron.schedule(
    '0 * * * *', // Every hour at minute 0
    async () => {
      console.log(`[${new Date().toISOString()}] Running scheduled absence processing...`);
      try {
        const updatedCount = await processAbsencesForNext14Days();
        console.log(`Absence processing completed. Updated ${updatedCount} cell(s).`);
      } catch (error) {
        console.error('Error during scheduled absence processing:', error);
      }
    },
    {
      timezone: config.scheduling.timezone,
    }
  );

  console.log('Absence processing scheduler started successfully.');
}

export function restartScheduler(): void {
  console.log('Restarting scheduler with new configuration...');
  stopScheduler();
  startScheduler();
  console.log('Scheduler restarted successfully.');
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
  if (reminderTask) {
    reminderTask.stop();
    reminderTask = null;
    console.log('Reminder scheduler stopped.');
  }
  if (absenceTask) {
    absenceTask.stop();
    absenceTask = null;
    console.log('Absence processing scheduler stopped.');
  }
}

function calculateReminderTime(postHour: number, postMinute: number, hoursBefore: number): { hour: number; minute: number } {
  let reminderHour = postHour - hoursBefore;
  let reminderMinute = postMinute;

  // Handle negative hours (e.g., 02:00 - 3h = 23:00 previous day)
  if (reminderHour < 0) {
    reminderHour += 24;
  }

  return { hour: reminderHour, minute: reminderMinute };
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
