import cron from 'node-cron';
import { postScheduleToChannel, client } from '../bot/client.js';
import { sendRemindersToUsersWithoutEntry } from '../bot/interactions/reminder.js';
import { refreshWeeklyOverview } from '../bot/utils/weekly-overview.js';
import { addMissingDays } from '../repositories/schedule.repository.js';
import { getAllOrganizations } from '../repositories/organization.repository.js';
import { getOrgConfig } from '../shared/config/config.js';
import { runWithOrg } from '../shared/tenancy/orgContext.js';
import { computeDue } from './schedule-timing.js';
import { getCurrentWeekMonday, getNextWeekMonday } from '../bot/utils/week-utils.js';
import { logger, getErrorMessage } from '../shared/utils/logger.js';

let tickTask: cron.ScheduledTask | null = null;

const DEFAULT_TIMEZONE = 'Europe/Berlin';

function validateTimezone(tz: string): string {
  try {
    if (Intl.supportedValuesOf('timeZone').includes(tz)) return tz;
  } catch {
    // Intl.supportedValuesOf not available in older runtimes
  }
  return DEFAULT_TIMEZONE;
}

/**
 * Per-org scheduler. A single minute tick walks every organization and runs the
 * actions that are due for that org at this minute (in the org's own timezone
 * and with its own config). One bot, many teams.
 */
export function startScheduler(): void {
  tickTask = cron.schedule('* * * * *', () => {
    void runTick(new Date());
  });
  logger.success('Scheduler started', 'Per-org minute tick');
}

export function restartScheduler(): void {
  logger.info('Restarting scheduler');
  stopScheduler();
  startScheduler();
}

export function stopScheduler(): void {
  if (tickTask) {
    tickTask.stop();
    tickTask = null;
  }
  logger.info('Scheduler stopped');
}

async function runTick(now: Date): Promise<void> {
  let orgs;
  try {
    orgs = await getAllOrganizations();
  } catch (error) {
    logger.error('Scheduler tick: failed to list orgs', getErrorMessage(error));
    return;
  }

  for (const org of orgs) {
    try {
      const rt = await getOrgConfig(org.id);
      const tz = validateTimezone(rt.settings.scheduling.timezone);
      const due = computeDue(rt.settings.scheduling, now, tz);
      if (!due.post && !due.reminder && !due.duplicateReminder && !due.weeklyPing) continue;

      await runWithOrg(org.id, async () => {
        if (due.post) {
          logger.info('Scheduled post', org.slug);
          await postScheduleToChannel();
        }
        if (due.reminder || due.duplicateReminder) {
          logger.info('Scheduled reminder', org.slug);
          await sendRemindersToUsersWithoutEntry(client);
        }
        if (due.weeklyPing) {
          const weekMonday = due.weeklyTarget === 'next' ? getNextWeekMonday() : getCurrentWeekMonday();
          logger.info('Weekly planning reminder', `${org.slug} (${due.weeklyTarget} week ${weekMonday})`);
          await addMissingDays();
          await refreshWeeklyOverview(client);
          await sendRemindersToUsersWithoutEntry(client, { weekMonday, variant: 'weekly-planning' });
        }
      });
    } catch (error) {
      logger.error('Scheduler tick failed', `${org.slug}: ${getErrorMessage(error)}`);
    }
  }
}

/** Kept for the startup log; the per-org tick has no single "next" time. */
export function getNextScheduledTime(): Date | null {
  return null;
}
