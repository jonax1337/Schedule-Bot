import { ChatInputCommandInteraction, MessageFlags, EmbedBuilder } from 'discord.js';
import { getAnalyzedSchedule } from '../../shared/utils/scheduleDetails.js';
import { buildScheduleEmbed, COLORS } from '../embeds/embed.js';
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
    const targetDate = dateOption || formatDateToDDMMYYYY(new Date());
    const displayDate = targetDate;

    const result = await getAnalyzedSchedule(targetDate);

    if (!result) {
      const embed = new EmbedBuilder()
        .setTitle(displayDate)
        .setDescription('No schedule data available for this date.')
        .setColor(COLORS.ERROR);
      await interaction.editReply({ embeds: [embed] });
      return;
    }

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
      .setColor(COLORS.ERROR);
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
    const targetDate = dateOption || formatDateToDDMMYYYY(new Date());
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
