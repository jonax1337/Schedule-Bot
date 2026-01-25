import { Client, GatewayIntentBits } from 'discord.js';
import { config } from '../shared/config/config.js';
import { handleReady } from './events/ready.event.js';
import { handleInteraction } from './events/interaction.event.js';

/**
 * Discord Bot Client
 */
export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ],
});

/**
 * Register event handlers
 */
client.once('ready', async () => {
  await handleReady(client);
});

client.on('interactionCreate', async (interaction) => {
  await handleInteraction(interaction);
});

/**
 * Start the bot
 */
export async function startBot(): Promise<void> {
  await client.login(config.discord.token);
}

/**
 * Export postScheduleToChannel for backward compatibility
 */
export { postScheduleToChannel } from './utils/schedule-poster.js';
