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
 * Status priority for detecting improvements
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
 * Check if schedule status improved after an availability change and send notification.
 * Only triggers for today's date when changeNotificationsEnabled is true.
 * Sends a training start poll only when transitioning FROM NOT_ENOUGH to a playable status,
 * to avoid duplicate polls when a poll was already created (e.g. WITH_SUBS → FULL_ROSTER).
 */
export async function checkAndNotifyStatusChange(
  date: string,
  previousStatus: ScheduleStatus,
  clientInstance?: Client
): Promise<void> {
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

    // Get current status after update
    const current = await getScheduleStatus(date);
    if (!current) {
      logger.warn('Change notification: skipped (could not fetch current status)');
      return;
    }

    const newStatus = current.status;

    // Only notify on status improvements
    const oldPriority = STATUS_PRIORITY[previousStatus];
    const newPriority = STATUS_PRIORITY[newStatus];
    if (newPriority <= oldPriority) {
      logger.info('Change notification: no improvement', `${previousStatus}(${oldPriority}) → ${newStatus}(${newPriority})`);
      return;
    }

    logger.info('Change notification: status improved', `${previousStatus} → ${newStatus}`);

    // Get Discord channel
    const botClient = clientInstance || (await import('../client.js')).client;
    const channel = await botClient.channels.fetch(config.discord.channelId);

    if (!channel || !(channel instanceof TextChannel)) {
      logger.error('Change notification failed', 'Channel not found or not a text channel');
      return;
    }

    // Build and send the updated schedule embed (NO channel clearing)
    const embed = buildScheduleEmbed(current.result);

    await channel.send({
      content: `📢 **Schedule Update** — ${getStatusLabel(previousStatus)} → ${getStatusLabel(newStatus)}`,
      embeds: [embed],
    });

    logger.success('Schedule change notification sent', `${date}: ${previousStatus} → ${newStatus}`);

    // Send training start poll ONLY when transitioning FROM NOT_ENOUGH.
    // If previous status was already WITH_SUBS or FULL_ROSTER, a poll was already created
    // during the daily post — don't send a duplicate and don't delete the existing one.
    if (previousStatus === 'NOT_ENOUGH' && current.result.canProceed) {
      const { createTrainingStartPoll } = await import('../interactions/trainingStartPoll.js');
      await createTrainingStartPoll(current.result, date);
    }
  } catch (error) {
    logger.error('Schedule change notification error', error instanceof Error ? error.message : String(error));
  }
}
