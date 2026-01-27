import { TextChannel, EmbedBuilder, Client } from 'discord.js';
import { config } from '../../shared/config/config.js';
import { getScheduleForDate } from '../../repositories/schedule.repository.js';
import { getAbsentUserIdsForDate } from '../../repositories/absence.repository.js';
import { parseSchedule, analyzeSchedule } from '../../shared/utils/analyzer.js';
import { buildScheduleEmbed } from '../embeds/embed.js';
import { getTodayFormatted } from '../../shared/utils/dateFormatter.js';
import { logger } from '../../shared/utils/logger.js';

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
