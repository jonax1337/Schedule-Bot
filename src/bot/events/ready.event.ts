import { Client, REST, Routes } from 'discord.js';
import { config } from '../../shared/config/config.js';
import { commands } from '../commands/definitions.js';
import { logger } from '../../shared/utils/logger.js';

/**
 * Register slash commands with Discord
 */
export async function registerCommands(client: Client): Promise<void> {
  const rest = new REST({ version: '10' }).setToken(config.discord.token);

  try {
    logger.info('Registering slash commands');
    await rest.put(
      Routes.applicationGuildCommands(client.user!.id, config.discord.guildId),
      { body: commands }
    );
    logger.success('Slash commands registered');
  } catch (error) {
    logger.error('Slash command registration failed', error instanceof Error ? error.message : String(error));
  }
}

/**
 * Handle bot ready event
 */
export async function handleReady(client: Client): Promise<void> {
  await registerCommands(client);
}
