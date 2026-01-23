import { Client, REST, Routes } from 'discord.js';
import { config } from '../../shared/config/config.js';
import { commands } from '../commands/definitions.js';

/**
 * Register slash commands with Discord
 */
export async function registerCommands(client: Client): Promise<void> {
  const rest = new REST({ version: '10' }).setToken(config.discord.token);

  try {
    console.log('Registering slash commands...');
    await rest.put(
      Routes.applicationGuildCommands(client.user!.id, config.discord.guildId),
      { body: commands }
    );
    console.log('Slash commands registered successfully!');
  } catch (error) {
    console.error('Error registering slash commands:', error);
  }
}

/**
 * Handle bot ready event
 */
export async function handleReady(client: Client): Promise<void> {
  console.log(`Bot is ready! Logged in as ${client.user?.tag}`);
  await registerCommands(client);
}
