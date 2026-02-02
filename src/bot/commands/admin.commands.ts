import { ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { sendRemindersToUsersWithoutEntry } from '../interactions/reminder.js';
import { createInfoModal } from '../interactions/interactive.js';
import { logger, getErrorMessage } from '../../shared/utils/logger.js';

/**
 * Handle /remind command - Manually send reminders to users without availability entry (Admin)
 */
export async function handleSendRemindersCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const dateOption = interaction.options.getString('date');
    const targetDate = dateOption || undefined;

    await interaction.editReply({
      content: '⏳ Sending reminders to users without availability entry...',
    });

    // Get client dynamically to avoid circular dependency
    const { client } = await import('../client.js');
    await sendRemindersToUsersWithoutEntry(client, targetDate);

    await interaction.editReply({
      content: `✅ Reminders sent successfully! Check console for details.`,
    });
  } catch (error) {
    logger.error('Error handling send-reminders command', getErrorMessage(error));
    await interaction.editReply({
      content: 'An error occurred. Please try again later.',
    });
  }
}

/**
 * Handle /notify command - Send a notification to players (Admin)
 */
export async function handleInfoCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    const type = interaction.options.getString('type', true);
    const target = interaction.options.getString('target', true);
    const specificUser = interaction.options.getUser('specific-user');

    // Store all info in customId for modal submit handler
    const modalId = `info_modal_${type}_${target}_${specificUser?.id || 'none'}`;

    await interaction.showModal(createInfoModal(modalId));
  } catch (error) {
    logger.error('Error handling info command', getErrorMessage(error));
    if (interaction.isRepliable() && !interaction.replied) {
      await interaction.reply({
        content: 'An error occurred. Please try again later.',
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}
