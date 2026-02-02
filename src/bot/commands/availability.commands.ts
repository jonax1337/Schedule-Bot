import { ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { updateUserMapping } from '../../repositories/user-mapping.repository.js';
import { createDateSelectMenu, sendWeekOverview, sendMySchedule } from '../interactions/interactive.js';
import { isValidTimezone, getTimezoneAbbreviation } from '../../shared/utils/timezoneConverter.js';
import { config } from '../../shared/config/config.js';
import { logger, getErrorMessage } from '../../shared/utils/logger.js';
import { requireRegisteredUser } from '../utils/command-helpers.js';

/**
 * Handle /set command - Set your availability for upcoming days
 */
export async function handleAvailabilityCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const userMapping = await requireRegisteredUser(interaction);
    if (!userMapping) return;

    const dateSelectMenu = await createDateSelectMenu();

    await interaction.editReply({
      content: 'Select a date to set your availability:',
      components: [dateSelectMenu],
    });
  } catch (error) {
    logger.error('Error handling availability command', getErrorMessage(error));
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
 * Handle /set-timezone command - Set your personal timezone
 */
export async function handleSetTimezoneCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const userMapping = await requireRegisteredUser(interaction);
    if (!userMapping) return;

    const timezone = interaction.options.getString('timezone', true);

    if (!isValidTimezone(timezone)) {
      await interaction.editReply({
        content: `❌ **${timezone}** is not a valid timezone. Please use a valid IANA timezone (e.g., \`America/New_York\`, \`Europe/London\`, \`Asia/Tokyo\`).`,
      });
      return;
    }

    await updateUserMapping(interaction.user.id, { timezone });

    const abbr = getTimezoneAbbreviation(timezone);
    const botTz = config.scheduling.timezone;
    const botAbbr = getTimezoneAbbreviation(botTz);
    const isSame = timezone === botTz;

    await interaction.editReply({
      content: `✅ Your timezone has been set to **${timezone}** (${abbr}).${isSame ? '\n\nThis matches the bot timezone — no conversion will be applied.' : `\n\n⏰ Your time inputs will be automatically converted from ${abbr} → ${botAbbr} when setting availability.`}`,
    });
  } catch (error) {
    logger.error('Error setting timezone', getErrorMessage(error));
    await interaction.editReply({
      content: 'An error occurred while setting your timezone.',
    });
  }
}

/**
 * Handle /remove-timezone command - Remove personal timezone
 */
export async function handleRemoveTimezoneCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const userMapping = await requireRegisteredUser(interaction);
    if (!userMapping) return;

    if (!userMapping.timezone) {
      await interaction.editReply({
        content: '⚠️ You don\'t have a personal timezone set. The bot default is already being used.',
      });
      return;
    }

    const oldTz = userMapping.timezone;
    await updateUserMapping(interaction.user.id, { timezone: null });

    const botAbbr = getTimezoneAbbreviation(config.scheduling.timezone);
    await interaction.editReply({
      content: `✅ Your personal timezone (**${oldTz}**) has been removed.\n\nThe bot default timezone (${config.scheduling.timezone} / ${botAbbr}) will be used — no conversion will be applied.`,
    });
  } catch (error) {
    logger.error('Error removing timezone', getErrorMessage(error));
    await interaction.editReply({
      content: 'An error occurred while removing your timezone.',
    });
  }
}
