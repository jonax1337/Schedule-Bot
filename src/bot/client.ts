import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { config } from '../shared/config/config.js';
import { handleReady } from './events/ready.event.js';
import { handleInteraction } from './events/interaction.event.js';
import { logger, getErrorMessage } from '../shared/utils/logger.js';

/**
 * Discord Bot Client
 */
export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Message, Partials.Reaction],
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

// Unified reaction handler for polls (quick polls + training start polls)
async function handleReactionEvent(
  reaction: Parameters<typeof client.on<'messageReactionAdd'>>[1] extends (r: infer R, ...args: any[]) => any ? R : never,
  user: Parameters<typeof client.on<'messageReactionAdd'>>[1] extends (r: any, u: infer U, ...args: any[]) => any ? U : never,
  added: boolean
): Promise<void> {
  if (user.bot) return;

  // Fetch partial reactions if needed
  if (reaction.partial) {
    try { await reaction.fetch(); } catch { return; }
  }

  try {
    const { handlePollReaction } = await import('./interactions/polls.js');
    const { handleTrainingPollReaction } = await import('./interactions/trainingStartPoll.js');
    await handlePollReaction(reaction as any, user as any, added);
    await handleTrainingPollReaction(reaction as any, user as any, added);
  } catch (error) {
    logger.error(`Error handling reaction ${added ? 'add' : 'remove'}`, getErrorMessage(error));
  }
}

client.on('messageReactionAdd', (reaction, user) => handleReactionEvent(reaction, user, true));
client.on('messageReactionRemove', (reaction, user) => handleReactionEvent(reaction, user, false));

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
