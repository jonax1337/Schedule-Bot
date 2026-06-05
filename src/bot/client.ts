import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { config } from '../shared/config/config.js';
import { handleReady } from './events/ready.event.js';
import { handleInteraction } from './events/interaction.event.js';
import { getDefaultOrgId, getOrganizationByGuildId } from '../repositories/organization.repository.js';
import { runWithOrg } from '../shared/tenancy/orgContext.js';
import { getOrgConfig } from '../shared/config/config.js';
import { logger, getErrorMessage } from '../shared/utils/logger.js';

/**
 * Resolve the org for a Discord event from its guild and run the handler in that
 * org's context (so the Prisma guard scopes queries and config.* resolves to the
 * right team). Falls back to the default org when the guild isn't bound to one.
 */
async function inGuildOrg(guildId: string | null | undefined, fn: () => Promise<void>): Promise<void> {
  let orgId: string | null = null;
  if (guildId) {
    const org = await getOrganizationByGuildId(guildId);
    orgId = org?.id ?? null;
  }
  if (!orgId) orgId = await getDefaultOrgId();
  await getOrgConfig(orgId); // warm runtime config for this org
  await runWithOrg(orgId, fn);
}

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
  await inGuildOrg(undefined, () => handleReady(client));
});

client.on('interactionCreate', async (interaction) => {
  await inGuildOrg(interaction.guildId, () => handleInteraction(interaction));
});

// Reaction handlers for polls (quick polls + training start polls)
client.on('messageReactionAdd', async (reaction, user) => {
  if (user.bot) return;
  // Fetch partial reactions if needed
  if (reaction.partial) {
    try { await reaction.fetch(); } catch { return; }
  }
  try {
    await inGuildOrg(reaction.message.guildId, async () => {
      const { handlePollReaction } = await import('./interactions/polls.js');
      const { handleTrainingPollReaction } = await import('./interactions/trainingStartPoll.js');
      await handlePollReaction(reaction as any, user as any, true);
      await handleTrainingPollReaction(reaction as any, user as any, true);
    });
  } catch (error) {
    logger.error('Error handling reaction add', getErrorMessage(error));
  }
});

client.on('messageReactionRemove', async (reaction, user) => {
  if (user.bot) return;
  // For reaction removal, we don't need to fetch the full reaction data
  // We have enough info (emoji name, message ID, user ID) to remove the vote
  // Fetching might fail if this was the last reaction, which is fine
  if (reaction.partial) {
    try { await reaction.fetch(); } catch { /* Continue with partial data */ }
  }
  try {
    await inGuildOrg(reaction.message.guildId, async () => {
      const { handlePollReaction } = await import('./interactions/polls.js');
      const { handleTrainingPollReaction } = await import('./interactions/trainingStartPoll.js');
      await handlePollReaction(reaction as any, user as any, false);
      await handleTrainingPollReaction(reaction as any, user as any, false);
    });
  } catch (error) {
    logger.error('Error handling reaction remove', getErrorMessage(error));
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
