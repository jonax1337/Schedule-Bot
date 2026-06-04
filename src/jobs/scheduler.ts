import cron from 'node-cron';
import { config } from '../shared/config/config.js';
import { postScheduleToChannel, client } from '../bot/client.js';
import { sendRemindersToUsersWithoutEntry } from '../bot/interactions/reminder.js';
import { refreshWeeklyOverview } from '../bot/utils/weekly-overview.js';
import { addMissingDays } from '../repositories/schedule.repository.js';
import { getDefaultOrgId } from '../repositories/organization.repository.js';
import { runWithOrg } from '../shared/tenancy/orgContext.js';
import { getCurrentWeekMonday, getNextWeekMonday } from '../bot/utils/week-utils.js';
import { logger, getErrorMessage } from '../shared/utils/logger.js';

/**
 * PoC: cron fires outside any HTTP request, so it has no tenant context.
 * Run each job in the default org's context. (Later: loop over all orgs.)
 */
async function inDefaultOrg(fn: () => Promise<void>): Promise<void> {
  const orgId = await getDefaultOrgId();
  await runWithOrg(orgId, fn);
}

let scheduledTask: cron.ScheduledTask | null = null;
let reminderTask: cron.ScheduledTask | null = null;
let duplicateReminderTask: cron.ScheduledTask | null = null;
let weeklyPingTask: cron.ScheduledTask | null = null;

function parseTime(timeStr: string): { hour: number; minute: number } {
  const [hourStr, minuteStr] = timeStr.split(':');
  return {
    hour: parseInt(hourStr, 10),
    minute: parseInt(minuteStr, 10),
  };
}

const DEFAULT_TIMEZONE = 'Europe/Berlin';

const WEEKDAY_INDEX: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

function isWeeklyPingDay(tz: string): boolean {
  if (!config.scheduling.weeklyPingEnabled) return false;
  const days = config.scheduling.weeklyPingDays;
  if (days.length === 0) return false;
  const name = new Date().toLocaleString('en-US', { weekday: 'long', timeZone: tz });
  const idx = WEEKDAY_INDEX[name] ?? new Date().getDay();
  return days.includes(idx);
}

function validateTimezone(tz: string): string {
  try {
    const supported = Intl.supportedValuesOf('timeZone');
    if (supported.includes(tz)) return tz;
  } catch {
    // Intl.supportedValuesOf not available in older runtimes
  }
  logger.warn('Invalid timezone', `"${tz}" is not a valid IANA timezone. Falling back to ${DEFAULT_TIMEZONE}.`);
  return DEFAULT_TIMEZONE;
}

export function startScheduler(): void {
  const { hour, minute } = parseTime(config.scheduling.dailyPostTime);
  const timezone = validateTimezone(config.scheduling.timezone);

  // Cron format: minute hour * * * (every day at specified time)
  const cronExpression = `${minute} ${hour} * * *`;

  logger.info('Scheduler configured', `Daily post at ${config.scheduling.dailyPostTime} (${timezone})`);

  scheduledTask = cron.schedule(
    cronExpression,
    async () => {
      await inDefaultOrg(async () => {
        logger.info('Running scheduled post');
        try {
          await postScheduleToChannel();
          logger.success('Scheduled post completed');
        } catch (error) {
          logger.error('Scheduled post failed', getErrorMessage(error));
        }
      });
    },
    {
      timezone,
    }
  );

  // Reminder job X hours before daily post
  const reminderTime = calculateReminderTime(hour, minute, config.scheduling.reminderHoursBefore);
  const reminderCronExpression = `${reminderTime.minute} ${reminderTime.hour} * * *`;

  logger.info('Reminder configured', `At ${reminderTime.hour}:${String(reminderTime.minute).padStart(2, '0')} (${config.scheduling.reminderHoursBefore}h before post)`);

  reminderTask = cron.schedule(
    reminderCronExpression,
    async () => {
      await inDefaultOrg(async () => {
        if (isWeeklyPingDay(timezone)) {
          logger.info('Daily reminder skipped', 'Today is a weekly planning day');
          return;
        }
        logger.info('Running scheduled reminders');
        try {
          await sendRemindersToUsersWithoutEntry(client);
          logger.success('Reminders sent');
        } catch (error) {
          logger.error('Scheduled reminders failed', getErrorMessage(error));
        }
      });
    },
    {
      timezone,
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
        await inDefaultOrg(async () => {
          if (isWeeklyPingDay(timezone)) {
            logger.info('Duplicate reminder skipped', 'Today is a weekly planning day');
            return;
          }
          logger.info('Running duplicate reminders');
          try {
            await sendRemindersToUsersWithoutEntry(client);
            logger.success('Duplicate reminders sent');
          } catch (error) {
            logger.error('Duplicate reminders failed', getErrorMessage(error));
          }
        });
      },
      {
        timezone,
      }
    );
  }

  // Weekly availability ping: configurable days (cron 0=Sun..6=Sat).
  // Sundays target next week; all other days target the current week.
  const pingDays = config.scheduling.weeklyPingDays;
  if (config.scheduling.weeklyPingEnabled && pingDays.length > 0) {
    const { hour: wHour, minute: wMinute } = parseTime(config.scheduling.weeklyPingTime);
    const weeklyCron = `${wMinute} ${wHour} * * ${pingDays.join(',')}`;
    const dayNames = pingDays.map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ');
    logger.info('Weekly ping configured', `At ${config.scheduling.weeklyPingTime} on ${dayNames} (${timezone})`);

    weeklyPingTask = cron.schedule(
      weeklyCron,
      async () => {
        await inDefaultOrg(async () => {
          const dayOfWeek = new Date().toLocaleString('en-US', { weekday: 'long', timeZone: timezone });
          const targetWeek: 'current' | 'next' = dayOfWeek === 'Sunday' ? 'next' : 'current';
          const weekMonday = targetWeek === 'next' ? getNextWeekMonday() : getCurrentWeekMonday();
          logger.info('Running weekly planning reminder', `${targetWeek} week (${weekMonday})`);
          try {
            await addMissingDays();
            await refreshWeeklyOverview(client);
            await sendRemindersToUsersWithoutEntry(client, { weekMonday, variant: 'weekly-planning' });
            logger.success('Weekly planning reminder completed', `${targetWeek} week ${weekMonday}`);
          } catch (error) {
            logger.error('Weekly planning reminder failed', getErrorMessage(error));
          }
        });
      },
      { timezone },
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
  if (weeklyPingTask) {
    weeklyPingTask.stop();
    weeklyPingTask = null;
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
