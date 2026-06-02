import { Interaction } from 'discord.js';
import { handleCommand } from '../commands/index.js';
import { logger, getErrorMessage } from '../../shared/utils/logger.js';
import {
  handleDateNavigation,
  handleAvailabilityButton,
  handleDateSelect,
  handleInfoModal,
  handleTimeModal,
  handleTimezoneButton,
  handleTimezoneSelect,
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
      } else if (interaction.customId === 'set_timezone_prompt') {
        await handleTimezoneButton(interaction);
      }
      return;
    }

    // Handle select menu interactions
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === 'select_date') {
        await handleDateSelect(interaction);
      } else if (interaction.customId === 'select_timezone') {
        await handleTimezoneSelect(interaction);
      }
      return;
    }

    // Handle modal submissions
    if (interaction.isModalSubmit()) {
      if (interaction.customId.startsWith('info_modal_')) {
        await handleInfoModal(interaction);
      } else if (interaction.customId.startsWith('time_modal_')) {
        await handleTimeModal(interaction);
      }
      return;
    }
    // Handle autocomplete interactions
    if (interaction.isAutocomplete()) {
      if (interaction.commandName === 'set-timezone') {
        const focused = interaction.options.getFocused().toLowerCase();
        const { getSupportedTimezones } = await import('../../shared/utils/timezoneConverter.js');
        const allTimezones = getSupportedTimezones();
        const filtered = focused
          ? allTimezones.filter(tz => tz.toLowerCase().includes(focused))
          : allTimezones;
        await interaction.respond(
          filtered.slice(0, 25).map(tz => ({ name: tz, value: tz }))
        );
      }
      return;
    }
  } catch (error) {
    logger.error('Error handling interaction', getErrorMessage(error));
  }
}
