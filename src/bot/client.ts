import { Client, GatewayIntentBits, Partials } from 'discord.js';
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

// Reaction handlers for polls (quick polls + training start polls)
client.on('messageReactionAdd', async (reaction, user) => {
  if (user.bot) return;
  // Fetch partial reactions if needed
  if (reaction.partial) {
    try { await reaction.fetch(); } catch { return; }
  }
  try {
    const { handlePollReaction } = await import('./interactions/polls.js');
    const { handleTrainingPollReaction } = await import('./interactions/trainingStartPoll.js');
    await handlePollReaction(reaction as any, user as any, true);
    await handleTrainingPollReaction(reaction as any, user as any, true);
  } catch (error) {
    console.error('Error handling reaction add:', error);
  }
});

client.on('messageReactionRemove', async (reaction, user) => {
  if (user.bot) return;
  if (reaction.partial) {
    try { await reaction.fetch(); } catch { return; }
  }
  try {
    const { handlePollReaction } = await import('./interactions/polls.js');
    const { handleTrainingPollReaction } = await import('./interactions/trainingStartPoll.js');
    await handlePollReaction(reaction as any, user as any, false);
    await handleTrainingPollReaction(reaction as any, user as any, false);
  } catch (error) {
    console.error('Error handling reaction remove:', error);
  }
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
