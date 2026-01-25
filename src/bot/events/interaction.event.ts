import { Interaction } from 'discord.js';
import { handleCommand } from '../commands/index.js';
import {
  handleDateNavigation,
  handleAvailabilityButton,
  handleDateSelect,
  handleWeekModal,
  handleInfoModal,
  handleTimeModal,
} from '../interactions/interactive.js';

/**
 * Handle all interaction events (commands, buttons, modals, etc.)
 */
export async function handleInteraction(interaction: Interaction): Promise<void> {
  try {
    // Handle slash commands
    if (interaction.isChatInputCommand()) {
      await handleCommand(interaction);
      return;
    }

    // Handle button interactions
    if (interaction.isButton()) {
      if (interaction.customId.startsWith('schedule_')) {
        await handleDateNavigation(interaction);
      } else if (
        interaction.customId.startsWith('set_unavailable_') ||
        interaction.customId.startsWith('set_custom_')
      ) {
        await handleAvailabilityButton(interaction);
      }
      return;
    }

    // Handle select menu interactions
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === 'select_date') {
        await handleDateSelect(interaction);
      }
      return;
    }

    // Handle modal submissions
    if (interaction.isModalSubmit()) {
      if (interaction.customId.startsWith('week_modal_')) {
        await handleWeekModal(interaction);
      } else if (interaction.customId.startsWith('info_modal_')) {
        await handleInfoModal(interaction);
      } else if (interaction.customId.startsWith('time_modal_')) {
        await handleTimeModal(interaction);
      }
      return;
    }
  } catch (error) {
    console.error('Error handling interaction:', error);
  }
}
