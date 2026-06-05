import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { config } from '../shared/config/config.js';
import { handleReady } from './events/ready.event.js';
import { handleInteraction } from './events/interaction.event.js';
import {
  getDefaultOrgId,
  getOrganizationByChannelId,
  getOrganizationsByGuildId,
} from '../repositories/organization.repository.js';
import { runWithOrg } from '../shared/tenancy/orgContext.js';
import { getOrgConfig } from '../shared/config/config.js';
import { logger, getErrorMessage } from '../shared/utils/logger.js';

/**
 * Resolve which org a Discord event belongs to. Channel first (a team's posting
 * channel — lets several teams share one guild, e.g. Main + Academy); else the
 * guild if it hosts exactly one team; else the default org.
 */
async function resolveEventOrgId(guildId: string | null | undefined, channelId: string | null | undefined): Promise<string> {
  if (channelId) {
    const byChannel = await getOrganizationByChannelId(channelId);
    if (byChannel) return byChannel.id;
  }
  if (guildId) {
    const orgs = await getOrganizationsByGuildId(guildId);
    if (orgs.length === 1) return orgs[0].id;
  }
  return getDefaultOrgId();
}

/**
 * Run a Discord event handler in its org's context (Prisma guard scoping +
 * per-org config.*).
 */
async function inEventOrg(
  guildId: string | null | undefined,
  channelId: string | null | undefined,
  fn: () => Promise<void>,
): Promise<void> {
  const orgId = await resolveEventOrgId(guildId, channelId);
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
  await inEventOrg(undefined, undefined, () => handleReady(client));
});

client.on('interactionCreate', async (interaction) => {
  await inEventOrg(interaction.guildId, interaction.channelId, () => handleInteraction(interaction));
});

// Reaction handlers for polls (quick polls + training start polls)
client.on('messageReactionAdd', async (reaction, user) => {
  if (user.bot) return;
  // Fetch partial reactions if needed
  if (reaction.partial) {
    try { await reaction.fetch(); } catch { return; }
  }
  try {
    await inEventOrg(reaction.message.guildId, reaction.message.channelId, async () => {
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
    await inEventOrg(reaction.message.guildId, reaction.message.channelId, async () => {
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
