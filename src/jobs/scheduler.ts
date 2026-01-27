import cron from 'node-cron';
import { config } from '../shared/config/config.js';
import { postScheduleToChannel, client } from '../bot/client.js';
import { sendRemindersToUsersWithoutEntry } from '../bot/interactions/reminder.js';
import { logger } from '../shared/utils/logger.js';

let scheduledTask: cron.ScheduledTask | null = null;
let reminderTask: cron.ScheduledTask | null = null;
let duplicateReminderTask: cron.ScheduledTask | null = null;

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

  logger.info('Scheduler configured', `Daily post at ${config.scheduling.dailyPostTime} (${config.scheduling.timezone})`);

  scheduledTask = cron.schedule(
    cronExpression,
    async () => {
      logger.info('Running scheduled post');
      try {
        await postScheduleToChannel();
        logger.success('Scheduled post completed');
      } catch (error) {
        logger.error('Scheduled post failed', error instanceof Error ? error.message : String(error));
      }
    },
    {
      timezone: config.scheduling.timezone,
    }
  );

  // Reminder job X hours before daily post
  const reminderTime = calculateReminderTime(hour, minute, config.scheduling.reminderHoursBefore);
  const reminderCronExpression = `${reminderTime.minute} ${reminderTime.hour} * * *`;

  logger.info('Reminder configured', `At ${reminderTime.hour}:${String(reminderTime.minute).padStart(2, '0')} (${config.scheduling.reminderHoursBefore}h before post)`);

  reminderTask = cron.schedule(
    reminderCronExpression,
    async () => {
      logger.info('Running scheduled reminders');
      try {
        await sendRemindersToUsersWithoutEntry(client);
        logger.success('Reminders sent');
      } catch (error) {
        logger.error('Scheduled reminders failed', error instanceof Error ? error.message : String(error));
      }
    },
    {
      timezone: config.scheduling.timezone,
    }
  );

  // Duplicate reminder job (second reminder, closer to post time)
  if (config.scheduling.duplicateReminderEnabled) {
    const dupReminderTime = calculateReminderTime(hour, minute, config.scheduling.duplicateReminderHoursBefore);
    const dupReminderCronExpression = `${dupReminderTime.minute} ${dupReminderTime.hour} * * *`;

    logger.info('Duplicate reminder configured', `At ${dupReminderTime.hour}:${String(dupReminderTime.minute).padStart(2, '0')} (${config.scheduling.duplicateReminderHoursBefore}h before post)`);

    duplicateReminderTask = cron.schedule(
      dupReminderCronExpression,
      async () => {
        logger.info('Running duplicate reminders');
        try {
          await sendRemindersToUsersWithoutEntry(client);
          logger.success('Duplicate reminders sent');
        } catch (error) {
          logger.error('Duplicate reminders failed', error instanceof Error ? error.message : String(error));
        }
      },
      {
        timezone: config.scheduling.timezone,
      }
    );
  }

  logger.success('Scheduler started');
}

export function restartScheduler(): void {
  logger.info('Restarting scheduler');
  stopScheduler();
  startScheduler();
}

export function stopScheduler(): void {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
  }
  if (reminderTask) {
    reminderTask.stop();
    reminderTask = null;
  }
  if (duplicateReminderTask) {
    duplicateReminderTask.stop();
    duplicateReminderTask = null;
  }
  logger.info('Scheduler stopped');
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
