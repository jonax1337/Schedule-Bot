import { TextChannel, EmbedBuilder, Client } from 'discord.js';
import { config } from '../../shared/config/config.js';
import { getScheduleForDate } from '../../repositories/schedule.repository.js';
import { getAbsentUserIdsForDate } from '../../repositories/absence.repository.js';
import { parseSchedule, analyzeSchedule } from '../../shared/utils/analyzer.js';
import { buildScheduleEmbed } from '../embeds/embed.js';
import { getTodayFormatted } from '../../shared/utils/dateFormatter.js';
import { logger } from '../../shared/utils/logger.js';
import type { ScheduleStatus, ScheduleResult } from '../../shared/types/types.js';

/**
 * Post schedule to configured Discord channel
 */
export async function postScheduleToChannel(date?: string, clientInstance?: Client): Promise<void> {
  // Get client from parameter or import dynamically to avoid circular dependency
  const botClient = clientInstance || (await import('../client.js')).client;
  const channel = await botClient.channels.fetch(config.discord.channelId);

  if (!channel || !(channel instanceof TextChannel)) {
    logger.error('Schedule post failed', 'Channel not found or is not a text channel');
    return;
  }

  try {
    const targetDate = date || getTodayFormatted();

    // Clean channel if enabled in settings
    const { loadSettings } = await import('../../shared/utils/settingsManager.js');
    const settings = loadSettings();

    if (settings.scheduling.cleanChannelBeforePost) {
      try {
        const messages = await channel.messages.fetch({ limit: 100 });
        const messagestoDelete = messages.filter(msg => !msg.pinned);

        if (messagestoDelete.size > 0) {
          const recentMessages = messagestoDelete.filter(msg =>
            Date.now() - msg.createdTimestamp < 14 * 24 * 60 * 60 * 1000
          );

          if (recentMessages.size > 1) {
            await channel.bulkDelete(recentMessages);
            logger.info('Channel cleaned', `Deleted ${recentMessages.size} messages`);
          } else if (recentMessages.size === 1) {
            await recentMessages.first()?.delete();
            logger.info('Channel cleaned', 'Deleted 1 message');
          }

          const oldMessages = messagestoDelete.filter(msg =>
            Date.now() - msg.createdTimestamp >= 14 * 24 * 60 * 60 * 1000
          );

          for (const msg of oldMessages.values()) {
            try {
              await msg.delete();
            } catch (err) {
              logger.warn('Could not delete old message', err instanceof Error ? err.message : String(err));
            }
          }
        }
      } catch (error) {
        logger.error('Channel cleaning failed', error instanceof Error ? error.message : String(error));
      }
    }

    const displayDate = targetDate;
    const sheetData = await getScheduleForDate(targetDate);

    if (!sheetData) {
      const embed = new EmbedBuilder()
        .setTitle(displayDate)
        .setDescription('No schedule data available for this date.')
        .setColor(0xe74c3c);
      await channel.send({ embeds: [embed] });
      return;
    }

    const absentUserIds = await getAbsentUserIdsForDate(targetDate);
    const schedule = parseSchedule(sheetData, absentUserIds);
    const result = analyzeSchedule(schedule);
    const embed = buildScheduleEmbed(result);

    // Ping role if configured
    const pingContent = config.discord.pingRoleId
      ? `<@&${config.discord.pingRoleId}>`
      : undefined;

    await channel.send({ content: pingContent, embeds: [embed] });
    logger.success('Schedule posted', `Date: ${displayDate}`);

    // Create training start poll if enabled
    const { createTrainingStartPoll } = await import('../interactions/trainingStartPoll.js');
    await createTrainingStartPoll(result, displayDate);
  } catch (error) {
    logger.error('Schedule post failed', error instanceof Error ? error.message : String(error));
    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle('Error')
          .setDescription('Failed to fetch schedule data')
          .setColor(0xe74c3c)
      ],
    });
  }
}

/**
 * Get current schedule status for a date
 */
export async function getScheduleStatus(date: string): Promise<{ status: ScheduleStatus; result: ScheduleResult } | null> {
  const sheetData = await getScheduleForDate(date);
  if (!sheetData) return null;

  const absentUserIds = await getAbsentUserIdsForDate(date);
  const schedule = parseSchedule(sheetData, absentUserIds);
  const result = analyzeSchedule(schedule);

  return { status: result.status, result };
}

/**
 * Status priority for comparison
 */
const STATUS_PRIORITY: Record<ScheduleStatus, number> = {
  'OFF_DAY': -1,
  'NOT_ENOUGH': 0,
  'WITH_SUBS': 1,
  'FULL_ROSTER': 2,
};

/**
 * Get human-readable status label
 */
function getStatusLabel(status: ScheduleStatus): string {
  switch (status) {
    case 'FULL_ROSTER': return '✅ Full Roster';
    case 'WITH_SUBS': return '⚠️ With Subs';
    case 'NOT_ENOUGH': return '❌ Not Enough Players';
    case 'OFF_DAY': return '🟣 Off-Day';
  }
}

/**
 * Clean all non-pinned messages from the schedule channel
 */
async function cleanScheduleChannel(channel: TextChannel): Promise<void> {
  try {
    const messages = await channel.messages.fetch({ limit: 100 });
    const messagesToDelete = messages.filter(msg => !msg.pinned);

    if (messagesToDelete.size === 0) return;

    const recentMessages = messagesToDelete.filter(msg =>
      Date.now() - msg.createdTimestamp < 14 * 24 * 60 * 60 * 1000
    );

    if (recentMessages.size > 1) {
      await channel.bulkDelete(recentMessages);
    } else if (recentMessages.size === 1) {
      await recentMessages.first()?.delete();
    }

    const oldMessages = messagesToDelete.filter(msg =>
      Date.now() - msg.createdTimestamp >= 14 * 24 * 60 * 60 * 1000
    );

    for (const msg of oldMessages.values()) {
      try {
        await msg.delete();
      } catch (err) {
        logger.warn('Could not delete old message', err instanceof Error ? err.message : String(err));
      }
    }

    logger.info('Channel cleaned for status update', `Removed ${messagesToDelete.size} message(s)`);
  } catch (error) {
    logger.error('Channel cleaning failed', error instanceof Error ? error.message : String(error));
  }
}

/**
 * Check if the current time is at or after the configured daily post time
 */
function isAfterDailyPostTime(dailyPostTime: string, timezone: string): boolean {
  const [postHour, postMinute] = dailyPostTime.split(':').map(Number);
  const postTotalMinutes = postHour * 60 + postMinute;

  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const currentHour = parseInt(parts.find(p => p.type === 'hour')?.value ?? '0');
  const currentMinute = parseInt(parts.find(p => p.type === 'minute')?.value ?? '0');
  const currentTotalMinutes = currentHour * 60 + currentMinute;

  return currentTotalMinutes >= postTotalMinutes;
}

// Deduplication: prevent concurrent duplicate notifications
let notificationInProgress = false;

/**
 * Check if schedule status changed after an availability update and send notification.
 * Handles both upgrades (📈) and downgrades (📉).
 * Cleans the channel before posting so old embeds and polls are removed.
 * Creates a new training start poll when the new status allows training.
 * Uses a concurrency guard to prevent duplicate notifications from parallel API calls.
 * Only triggers after the configured daily post time has passed.
 */
export async function checkAndNotifyStatusChange(
  date: string,
  previousStatus: ScheduleStatus,
  clientInstance?: Client
): Promise<void> {
  // Guard against concurrent duplicate notifications (e.g. dashboard sending two requests)
  if (notificationInProgress) {
    logger.info('Change notification: skipped (already in progress)');
    return;
  }
  notificationInProgress = true;

  try {
    // Only notify for today's schedule
    const today = getTodayFormatted();
    if (date !== today) {
      logger.info('Change notification: skipped (not today)', `date=${date}, today=${today}`);
      return;
    }

    // Check if feature is enabled
    const { loadSettings } = await import('../../shared/utils/settingsManager.js');
    const settings = loadSettings();
    if (!settings.scheduling.changeNotificationsEnabled) {
      logger.info('Change notification: skipped (feature disabled)');
      return;
    }

    // Only notify after the daily post time (before that, the daily post hasn't been sent yet)
    if (!isAfterDailyPostTime(settings.scheduling.dailyPostTime, settings.scheduling.timezone)) {
      logger.info('Change notification: skipped (before daily post time)');
      return;
    }

    // Get current status after update
    const current = await getScheduleStatus(date);
    if (!current) {
      logger.warn('Change notification: skipped (could not fetch current status)');
      return;
    }

    const newStatus = current.status;

    // Suppress notifications when Off-Day is already active and a player changes availability
    // (the schedule status stays OFF_DAY regardless, so no update is needed).
    // Transitions to/from Off-Day (reason changes) should still send updates.
    if (newStatus === 'OFF_DAY' && previousStatus === 'OFF_DAY') {
      logger.info('Change notification: skipped (Off-Day active)');
      return;
    }

    const oldPriority = STATUS_PRIORITY[previousStatus];
    const newPriority = STATUS_PRIORITY[newStatus];

    // No change = no notification
    if (newPriority === oldPriority) {
      logger.info('Change notification: no change', `${previousStatus}(${oldPriority}) → ${newStatus}(${newPriority})`);
      return;
    }

    const isUpgrade = newPriority > oldPriority;
    const direction = isUpgrade ? 'improved' : 'downgraded';
    const emoji = isUpgrade ? '📈' : '📉';
    logger.info(`Change notification: status ${direction}`, `${previousStatus} → ${newStatus}`);

    // Get Discord channel
    const botClient = clientInstance || (await import('../client.js')).client;
    const channel = await botClient.channels.fetch(config.discord.channelId);

    if (!channel || !(channel instanceof TextChannel)) {
      logger.error('Change notification failed', 'Channel not found or not a text channel');
      return;
    }

    // Clean channel first (removes old schedule embed, previous updates, and polls)
    await cleanScheduleChannel(channel);

    // Build and send updated schedule embed with role ping
    const embed = buildScheduleEmbed(current.result);
    const pingContent = config.discord.pingRoleId ? `<@&${config.discord.pingRoleId}>\n` : '';

    await channel.send({
      content: `${pingContent}${emoji} **Schedule Update** — ${getStatusLabel(previousStatus)} → ${getStatusLabel(newStatus)}`,
      embeds: [embed],
    });

    logger.success('Schedule change notification sent', `${date}: ${previousStatus} → ${newStatus}`);

    // Create training start poll if training can proceed with new status.
    // Since channel was cleaned, any old poll is gone — always create a fresh one.
    if (current.result.canProceed) {
      const { createTrainingStartPoll } = await import('../interactions/trainingStartPoll.js');
      await createTrainingStartPoll(current.result, date);
    }
  } catch (error) {
    logger.error('Schedule change notification error', error instanceof Error ? error.message : String(error));
  } finally {
    notificationInProgress = false;
  }
}
