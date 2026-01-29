import { EmbedBuilder, Message, MessageReaction, User, TextChannel } from 'discord.js';
import { client } from '../client.js';
import { config } from '../../shared/config/config.js';
import { logger } from '../../shared/utils/logger.js';

interface PollOption {
  emoji: string;
  label: string;
  votes: string[]; // User IDs
}

interface Poll {
  messageId: string;
  question: string;
  options: PollOption[];
  createdBy: string;
  expiresAt: Date;
  type: 'training' | 'maps' | 'quick';
  date?: string; // For training/maps polls
  closeTimer?: ReturnType<typeof setTimeout>;
  countdownTimer?: ReturnType<typeof setInterval>;
}

const activePolls = new Map<string, Poll>();

/**
 * Format remaining time as a human-readable string.
 */
function formatRemainingTime(ms: number): string {
  if (ms <= 0) return '0 minutes';
  const totalMinutes = Math.ceil(ms / 60_000);
  if (totalMinutes < 60) return `${totalMinutes} minute${totalMinutes !== 1 ? 's' : ''}`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (minutes === 0) return `${hours} hour${hours !== 1 ? 's' : ''}`;
  return `${hours}h ${minutes}m`;
}

/**
 * Update the footer of a poll embed with remaining time.
 */
async function updatePollFooter(poll: Poll): Promise<void> {
  try {
    const remaining = poll.expiresAt.getTime() - Date.now();
    if (remaining <= 0) return;

    const channel = await client.channels.fetch(config.discord.channelId);
    if (!channel || !channel.isTextBased()) return;

    const message = await channel.messages.fetch(poll.messageId);
    const embed = message.embeds[0];
    if (!embed) return;

    const newEmbed = EmbedBuilder.from(embed);
    newEmbed.setFooter({ text: `Poll closes in ${formatRemainingTime(remaining)}` });

    await message.edit({ embeds: [newEmbed] });
  } catch {
    // Message may have been deleted
  }
}

/**
 * Start close timer and countdown interval for a poll.
 */
function startPollTimers(poll: Poll): void {
  const remaining = poll.expiresAt.getTime() - Date.now();
  if (remaining <= 0) {
    closePoll(poll.messageId);
    return;
  }

  poll.closeTimer = setTimeout(() => closePoll(poll.messageId), remaining);
  poll.countdownTimer = setInterval(() => updatePollFooter(poll), 60_000);
}

/**
 * Clear all timers for a poll.
 */
function clearPollTimers(poll: Poll): void {
  if (poll.closeTimer) clearTimeout(poll.closeTimer);
  if (poll.countdownTimer) clearInterval(poll.countdownTimer);
}

export async function createQuickPoll(
  question: string,
  options: string[],
  createdBy: string,
  durationMinutes: number = 60
): Promise<Message> {
  const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

  const pollOptions: PollOption[] = options.slice(0, 10).map((opt, i) => ({
    emoji: emojis[i],
    label: opt,
    votes: [],
  }));

  const durationMs = durationMinutes * 60 * 1000;

  const embed = new EmbedBuilder()
    .setColor(0xf39c12)
    .setTitle(question)
    .setDescription('React to vote!')
    .setFooter({ text: `Poll closes in ${formatRemainingTime(durationMs)}` })
    .setTimestamp();

  pollOptions.forEach(opt => {
    embed.addFields({
      name: `${opt.emoji} ${opt.label}`,
      value: '0 votes',
      inline: false,
    });
  });

  const channel = await client.channels.fetch(config.discord.channelId);
  if (!channel || !channel.isTextBased()) {
    throw new Error('Channel not found or not text-based');
  }

  const message = await (channel as any).send({ embeds: [embed] });

  for (const opt of pollOptions) {
    await message.react(opt.emoji);
  }

  const poll: Poll = {
    messageId: message.id,
    question,
    options: pollOptions,
    createdBy,
    expiresAt: new Date(Date.now() + durationMs),
    type: 'quick',
  };

  activePolls.set(message.id, poll);
  startPollTimers(poll);

  return message;
}

export async function handlePollReaction(
  reaction: MessageReaction,
  user: User,
  added: boolean
): Promise<void> {
  if (user.bot) return;

  const poll = activePolls.get(reaction.message.id);
  if (!poll) return;

  const option = poll.options.find(opt => opt.emoji === reaction.emoji.name);
  if (!option) return;

  if (added) {
    if (!option.votes.includes(user.id)) {
      option.votes.push(user.id);
    }
  } else {
    const index = option.votes.indexOf(user.id);
    if (index > -1) {
      option.votes.splice(index, 1);
    }
  }

  await updatePollEmbed(poll);
}

async function updatePollEmbed(poll: Poll): Promise<void> {
  try {
    const channel = await client.channels.fetch(config.discord.channelId);
    if (!channel || !channel.isTextBased()) return;

    const message = await channel.messages.fetch(poll.messageId);
    const embed = message.embeds[0];
    if (!embed) return;

    const newEmbed = EmbedBuilder.from(embed);
    newEmbed.setFields([]);

    poll.options.forEach(opt => {
      newEmbed.addFields({
        name: `${opt.emoji} ${opt.label}`,
        value: `${opt.votes.length} vote${opt.votes.length !== 1 ? 's' : ''}`,
        inline: false,
      });
    });

    // Update footer with remaining time
    const remaining = poll.expiresAt.getTime() - Date.now();
    if (remaining > 0) {
      newEmbed.setFooter({ text: `Poll closes in ${formatRemainingTime(remaining)}` });
    }

    await message.edit({ embeds: [newEmbed] });
  } catch (error) {
    logger.error('Error updating poll embed', error instanceof Error ? error.message : String(error));
  }
}

async function closePoll(messageId: string): Promise<void> {
  const poll = activePolls.get(messageId);
  if (!poll) return;

  clearPollTimers(poll);

  try {
    const channel = await client.channels.fetch(config.discord.channelId);
    if (!channel || !channel.isTextBased()) return;

    const message = await channel.messages.fetch(messageId);

    // Sort options by votes
    const sorted = [...poll.options].sort((a, b) => b.votes.length - a.votes.length);
    const totalVotes = sorted.reduce((sum, opt) => sum + opt.votes.length, 0);

    let resultText = '**📊 Results:**\n\n';
    let winnerLabel: string;

    if (totalVotes === 0) {
      resultText += `No votes received.\n`;
      winnerLabel = sorted[0].label;
    } else {
      // Show top 3 (or fewer if they have 0 votes)
      const medals = ['🥇', '🥈', '🥉'];
      const shown = sorted.filter((opt, i) => i === 0 || opt.votes.length > 0).slice(0, 3);
      shown.forEach((opt, i) => {
        resultText += `${medals[i]} **${opt.label}** — ${opt.votes.length} vote${opt.votes.length !== 1 ? 's' : ''}\n`;
      });
      winnerLabel = sorted[0].label;
    }

    if (totalVotes > 0) {
      resultText += `\n✅ **Winner:** ${winnerLabel}`;
    }

    const embed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle(`${poll.question} — CLOSED`)
      .setDescription(resultText)
      .setFooter({ text: 'Poll closed' })
      .setTimestamp();

    await message.reactions.removeAll().catch(() => {});
    await message.edit({ embeds: [embed] });
    activePolls.delete(messageId);

    logger.info(`Poll closed: ${poll.question} - Winner: ${winnerLabel}`);
  } catch (error) {
    logger.error('Error closing poll', error instanceof Error ? error.message : String(error));
  }
}

/**
 * Recover open quick polls from channel after bot restart.
 */
export async function recoverQuickPolls(): Promise<void> {
  try {
    const channel = await client.channels.fetch(config.discord.channelId);
    if (!channel || !(channel instanceof TextChannel)) return;

    const messages = await channel.messages.fetch({ limit: 50 });
    const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

    for (const message of messages.values()) {
      if (!message.author.bot || message.author.id !== client.user?.id) continue;

      const embed = message.embeds[0];
      if (!embed) continue;

      // Identify open quick polls by description content
      if (!embed.description?.includes('React to vote!')) continue;
      // Skip training polls (identified by their own recovery)
      if (embed.title === 'When do you want to start?') continue;

      // Already tracked
      if (activePolls.has(message.id)) continue;

      // Check if already closed
      const footerText = embed.footer?.text || '';
      if (footerText === 'Poll closed') continue;

      // Parse duration from original footer like "Poll closes in X hour(s)" or recover from message age
      // Default to 1 hour duration if we can't determine
      const createdAt = message.createdTimestamp;
      let durationMs = 60 * 60 * 1000; // default 1 hour

      // Try to parse from footer "Poll closes in X hour(s)" or "Poll closes in Xh Ym"
      const hourMatch = footerText.match(/(\d+)\s*hour/);
      const hMatch = footerText.match(/(\d+)h\s*(\d+)m/);
      const minMatch = footerText.match(/(\d+)\s*minute/);
      if (hourMatch) {
        durationMs = Number(hourMatch[1]) * 60 * 60 * 1000;
      } else if (hMatch) {
        durationMs = (Number(hMatch[1]) * 60 + Number(hMatch[2])) * 60 * 1000;
      } else if (minMatch) {
        // This is remaining time, not total — estimate total from message age
        const remainingMinutes = Number(minMatch[1]);
        const elapsedMs = Date.now() - createdAt;
        durationMs = elapsedMs + remainingMinutes * 60 * 1000;
      }

      const expiresAt = new Date(createdAt + durationMs);

      // Reconstruct question from title
      const question = embed.title || 'Unknown';

      // Reconstruct options from fields
      const options: PollOption[] = [];
      for (let i = 0; i < (embed.fields?.length || 0); i++) {
        const field = embed.fields![i];
        const emoji = emojis[i];
        if (!emoji) break;

        // Extract label from field name like "1️⃣ Option text"
        const label = field.name.replace(/^[^\s]+\s/, '');

        // Get votes from reactions
        const reaction = message.reactions.cache.find(r => r.emoji.name === emoji);
        const voteCount = reaction ? Math.max(0, reaction.count - 1) : 0;

        options.push({
          emoji,
          label,
          votes: Array(voteCount).fill('unknown'),
        });
      }

      if (options.length === 0) continue;

      const poll: Poll = {
        messageId: message.id,
        question,
        options,
        createdBy: 'recovered',
        expiresAt,
        type: 'quick',
      };

      // If already expired, close it now
      if (expiresAt.getTime() <= Date.now()) {
        activePolls.set(message.id, poll);
        await closePoll(message.id);
        logger.info(`Recovered and closed expired quick poll: ${message.id}`);
        continue;
      }

      activePolls.set(message.id, poll);
      startPollTimers(poll);
      logger.info(`Recovered active quick poll: ${message.id} (closes in ${formatRemainingTime(expiresAt.getTime() - Date.now())})`);
    }
  } catch (error) {
    logger.error('Error recovering quick polls', error instanceof Error ? error.message : String(error));
  }
}

export function getActivePoll(messageId: string): Poll | undefined {
  return activePolls.get(messageId);
}
