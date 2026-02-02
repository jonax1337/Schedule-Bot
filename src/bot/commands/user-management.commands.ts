import { ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { getUserMapping, addUserMapping, removeUserMapping } from '../../repositories/user-mapping.repository.js';
import { logger, getErrorMessage } from '../../shared/utils/logger.js';

/**
 * Handle /register command - Register a user for availability management (Admin)
 */
export async function handleRegisterCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const user = interaction.options.getUser('user', true);
    const columnName = interaction.options.getString('column', true);
    const role = interaction.options.getString('role', true) as 'main' | 'sub' | 'coach';

    const existingMapping = await getUserMapping(user.id);
    if (existingMapping) {
      await interaction.editReply({
        content: `❌ ${user.username} is already registered as **${existingMapping.displayName}**.`,
      });
      return;
    }

    await addUserMapping({
      discordId: user.id,
      discordUsername: user.username,
      displayName: columnName,
      role,
    });

    await interaction.editReply({
      content: `✅ ${user.username} has been successfully registered as **${columnName}** (${role}).`,
    });
  } catch (error) {
    logger.error('Error handling register command', getErrorMessage(error));
    await interaction.editReply({
      content: 'An error occurred. Please try again later.',
    });
  }
}

/**
 * Handle /unregister command - Remove a user from availability management (Admin)
 */
export async function handleUnregisterCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const user = interaction.options.getUser('user', true);

    const success = await removeUserMapping(user.id);

    if (success) {
      await interaction.editReply({
        content: `✅ ${user.username} has been successfully removed from the system.`,
      });
    } else {
      await interaction.editReply({
        content: `❌ ${user.username} was not registered.`,
      });
    }
  } catch (error) {
    logger.error('Error handling unregister command', getErrorMessage(error));
    await interaction.editReply({
      content: 'An error occurred. Please try again later.',
    });
  }
}
