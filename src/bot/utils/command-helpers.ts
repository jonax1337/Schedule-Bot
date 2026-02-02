import type { ChatInputCommandInteraction } from 'discord.js';
import { getUserMapping, type UserMapping } from '../../repositories/user-mapping.repository.js';

/**
 * Check if user is registered and send error reply if not.
 * Returns the user mapping if found, or null if not registered (error already sent).
 */
export async function requireRegisteredUser(interaction: ChatInputCommandInteraction): Promise<UserMapping | null> {
  const userMapping = await getUserMapping(interaction.user.id);
  if (!userMapping) {
    await interaction.editReply({
      content: '❌ You are not registered yet. Please contact an admin to register you with `/register`.',
    });
    return null;
  }
  return userMapping;
}
