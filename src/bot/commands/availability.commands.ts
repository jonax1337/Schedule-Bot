import { ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { getUserMapping } from '../../repositories/user-mapping.repository.js';
import { createDateSelectMenu, sendWeekOverview, sendMySchedule, handleSetWeekCommand } from '../interactions/interactive.js';

/**
 * Handle /set command - Set your availability for upcoming days
 */
export async function handleAvailabilityCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const userMapping = await getUserMapping(interaction.user.id);
    
    if (!userMapping) {
      await interaction.editReply({
        content: '❌ You are not registered yet. Please contact an admin to register you with `/register`.'
      });
      return;
    }

    const dateSelectMenu = await createDateSelectMenu();

    await interaction.editReply({
      content: 'Select a date to set your availability:',
      components: [dateSelectMenu],
    });
  } catch (error) {
    console.error('Error handling availability command:', error);
    await interaction.editReply({
      content: 'An error occurred. Please try again later.',
    });
  }
}

/**
 * Handle /schedule-week command - Show availability for the next 7 days
 */
export async function handleScheduleWeekCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  await sendWeekOverview(interaction);
}

/**
 * Handle /my-schedule command - Show your personal availability for the next 14 days
 */
export async function handleMyScheduleCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  await sendMySchedule(interaction);
}

/**
 * Handle /set-week command - Set your availability for the next 7 days at once
 */
export async function handleSetWeekCommandWrapper(interaction: ChatInputCommandInteraction): Promise<void> {
  await handleSetWeekCommand(interaction);
}
