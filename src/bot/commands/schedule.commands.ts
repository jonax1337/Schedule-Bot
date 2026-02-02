import { ChatInputCommandInteraction, MessageFlags, EmbedBuilder } from 'discord.js';
import { getScheduleForDate } from '../../repositories/schedule.repository.js';
import { getAbsentUserIdsForDate } from '../../repositories/absence.repository.js';
import { parseSchedule, analyzeSchedule } from '../../shared/utils/analyzer.js';
import { buildScheduleEmbed } from '../embeds/embed.js';
import { createDateNavigationButtons } from '../interactions/interactive.js';
import { postScheduleToChannel } from '../utils/schedule-poster.js';
import { formatDateToDDMMYYYY, getTodayFormatted } from '../../shared/utils/dateFormatter.js';
import { logger, getErrorMessage } from '../../shared/utils/logger.js';

/**
 * Handle /schedule command - Check team availability for a specific date
 */
export async function handleScheduleCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const dateOption = interaction.options.getString('date');
    
    // Format date as DD.MM.YYYY
    const formatDate = (d: Date): string => {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}.${month}.${year}`;
    };
    
    const targetDate = dateOption || formatDate(new Date());
    const displayDate = targetDate;

    const sheetData = await getScheduleForDate(targetDate);

    if (!sheetData) {
      const embed = new EmbedBuilder()
        .setTitle(displayDate)
        .setDescription('No schedule data available for this date.')
        .setColor(0xe74c3c);
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    const absentUserIds = await getAbsentUserIdsForDate(targetDate);
    const schedule = parseSchedule(sheetData, absentUserIds);
    const result = analyzeSchedule(schedule);
    const embed = buildScheduleEmbed(result);

    const navigationButtons = await createDateNavigationButtons(displayDate);

    await interaction.editReply({ 
      embeds: [embed],
      components: [navigationButtons]
    });
  } catch (error) {
    logger.error('Error handling schedule command', getErrorMessage(error));
    const embed = new EmbedBuilder()
      .setTitle('Error')
      .setDescription('An error occurred. Please try again later.')
      .setColor(0xe74c3c);
    await interaction.editReply({
      embeds: [embed],
    });
  }
}

/**
 * Handle /post-schedule command - Post schedule to channel (Admin)
 */
export async function handlePostScheduleCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const dateOption = interaction.options.getString('date');
    
    // Format date as DD.MM.YYYY
    const formatDate = (d: Date): string => {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}.${month}.${year}`;
    };
    
    const targetDate = dateOption || formatDate(new Date());
    const displayDate = targetDate;

    // Post schedule to channel (like cron job does)
    await postScheduleToChannel(targetDate);

    await interaction.editReply({
      content: `✅ Schedule posted to channel for **${displayDate}**!`,
    });
  } catch (error) {
    logger.error('Error posting schedule', getErrorMessage(error));
    await interaction.editReply({
      content: '❌ An error occurred while posting the schedule.',
    });
  }
}
