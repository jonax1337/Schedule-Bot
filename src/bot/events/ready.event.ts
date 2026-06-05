import { Client, REST, Routes } from 'discord.js';
import { config } from '../../shared/config/config.js';
import { commands } from '../commands/definitions.js';
import { logger, getErrorMessage } from '../../shared/utils/logger.js';

/**
 * Register slash commands with Discord
 */
export async function registerCommands(client: Client): Promise<void> {
  const rest = new REST({ version: '10' }).setToken(config.discord.token);

  try {
    // Multi-tenant SaaS: register GLOBAL commands, not guild-scoped ones. Global
    // commands are available in every guild the bot is in — including servers a
    // new customer invites it to later — without per-guild registration. (The
    // old guild-scoped call required a single config.discord.guildId, which is
    // empty on a multi-tenant instance and would 404.)
    logger.info('Registering slash commands (global)');
    await rest.put(
      Routes.applicationCommands(client.user!.id),
      { body: commands }
    );
    logger.success('Slash commands registered (global)');
  } catch (error) {
    logger.error('Slash command registration failed', getErrorMessage(error));
  }
}

/**
 * Handle bot ready event
 */
export async function handleReady(client: Client): Promise<void> {
  await registerCommands(client);

  // Recover any open polls from before restart
  try {
    const { recoverTrainingPolls } = await import('../interactions/trainingStartPoll.js');
    const { recoverQuickPolls } = await import('../interactions/polls.js');
    await recoverTrainingPolls();
    await recoverQuickPolls();
  } catch (error) {
    logger.error('Error recovering polls on startup', getErrorMessage(error));
  }
}
