import { TextChannel, EmbedBuilder, Client } from 'discord.js';
import { config } from '../../shared/config/config.js';
import { getScheduleForDate } from '../../repositories/schedule.repository.js';
import { getAbsentUserIdsForDate } from '../../repositories/absence.repository.js';
import { parseSchedule, analyzeSchedule } from '../../shared/utils/analyzer.js';
import { buildScheduleEmbed } from '../embeds/embed.js';
import { formatDateToDDMMYYYY, getTodayFormatted } from '../../shared/utils/dateFormatter.js';

/**
 * Post schedule to configured Discord channel
 */
export async function postScheduleToChannel(date?: string, clientInstance?: Client): Promise<void> {
  // Get client from parameter or import dynamically to avoid circular dependency
  const botClient = clientInstance || (await import('../client.js')).client;
  const channel = await botClient.channels.fetch(config.discord.channelId);

  if (!channel || !(channel instanceof TextChannel)) {
    console.error('Channel not found or is not a text channel');
    return;
  }

  try {
    const targetDate = date || getTodayFormatted();

    // Clean channel if enabled in settings
    const { loadSettings } = await import('../../shared/utils/settingsManager.js');
    const settings = loadSettings();
    
    if (settings.scheduling.cleanChannelBeforePost) {
      console.log('Cleaning channel before posting schedule...');
      try {
        const messages = await channel.messages.fetch({ limit: 100 });
        const messagestoDelete = messages.filter(msg => !msg.pinned);
        
        if (messagestoDelete.size > 0) {
          const recentMessages = messagestoDelete.filter(msg => 
            Date.now() - msg.createdTimestamp < 14 * 24 * 60 * 60 * 1000
          );
          
          if (recentMessages.size > 1) {
            await channel.bulkDelete(recentMessages);
            console.log(`Deleted ${recentMessages.size} messages from channel`);
          } else if (recentMessages.size === 1) {
            await recentMessages.first()?.delete();
            console.log('Deleted 1 message from channel');
          }
          
          const oldMessages = messagestoDelete.filter(msg => 
            Date.now() - msg.createdTimestamp >= 14 * 24 * 60 * 60 * 1000
          );
          
          for (const msg of oldMessages.values()) {
            try {
              await msg.delete();
            } catch (err) {
              console.warn('Could not delete old message:', err);
            }
          }
        }
      } catch (error) {
        console.error('Error cleaning channel:', error);
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

    console.log('Posting schedule with pingRoleId:', config.discord.pingRoleId);
    console.log('Ping content:', pingContent);

    await channel.send({ content: pingContent, embeds: [embed] });
    console.log(`Schedule posted to channel for date: ${displayDate}`);

    // Create training start poll if enabled
    const { createTrainingStartPoll } = await import('../interactions/trainingStartPoll.js');
    await createTrainingStartPoll(result, displayDate);
  } catch (error) {
    console.error('Error posting schedule to channel:', error);
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
