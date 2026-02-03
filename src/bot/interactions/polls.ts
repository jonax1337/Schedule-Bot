import { Message, MessageReaction, User } from 'discord.js';
import { PollManager, PollOption, POLL_EMOJIS, formatRemainingTime } from './pollManager.js';
import { COLORS } from '../embeds/embed.js';
import { logger } from '../../shared/utils/logger.js';

/**
 * Quick Poll Option
 */
interface QuickPollOption extends PollOption {
  label: string;
}

/**
 * Quick Poll Manager singleton
 */
const quickPollManager = new PollManager<QuickPollOption>({
  color: COLORS.WARNING,
  description: 'React to vote!',
  closedSuffix: '— CLOSED',
  winnerPrefix: 'Winner',
  noVotesMessage: 'No votes received.',
  getOptionDisplay: (opt) => opt.label,
});

/**
 * Create a quick poll with custom question and options
 */
export async function createQuickPoll(
  question: string,
  options: string[],
  createdBy: string,
  durationMinutes: number = 60
): Promise<Message> {
  const pollOptions: QuickPollOption[] = options.slice(0, 10).map((opt, i) => ({
    emoji: POLL_EMOJIS[i],
    label: opt,
    votes: [],
  }));

  const durationMs = durationMinutes * 60 * 1000;

  return quickPollManager.sendPoll(
    question,
    pollOptions,
    durationMs,
    'quick',
    { createdBy }
  );
}

/**
 * Handle reactions on quick polls
 */
export async function handlePollReaction(
  reaction: MessageReaction,
  user: User,
  added: boolean
): Promise<void> {
  await quickPollManager.handleReaction(reaction, user, added);
}

/**
 * Recover open quick polls from channel after bot restart
 */
export async function recoverQuickPolls(): Promise<void> {
  await quickPollManager.recoverFromChannel(
    // Identify quick polls
    (embed, message) => {
      if (!embed) return false;
      const embedData = message.embeds[0];
      if (!embedData) return false;
      // Quick polls have "React to vote!" in description
      // And are NOT training polls (which have specific title)
      return (
        embedData.description?.includes('React to vote!') === true &&
        embedData.title !== 'When do you want to start?'
      );
    },
    // Reconstruct options from message
    (message) => {
      const embed = message.embeds[0];
      if (!embed?.fields) return [];

      const options: QuickPollOption[] = [];
      for (let i = 0; i < embed.fields.length; i++) {
        const field = embed.fields[i];
        const emoji = POLL_EMOJIS[i];
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
      return options;
    },
    // Get expiry time
    (message) => {
      const footerText = message.embeds[0]?.footer?.text || '';
      const createdAt = message.createdTimestamp;
      let durationMs = 60 * 60 * 1000; // default 1 hour

      // Try to parse from footer
      const hourMatch = footerText.match(/(\d+)\s*hour/);
      const hMatch = footerText.match(/(\d+)h\s*(\d+)m/);
      const minMatch = footerText.match(/(\d+)\s*minute/);

      if (hourMatch) {
        durationMs = Number(hourMatch[1]) * 60 * 60 * 1000;
      } else if (hMatch) {
        durationMs = (Number(hMatch[1]) * 60 + Number(hMatch[2])) * 60 * 1000;
      } else if (minMatch) {
        const remainingMinutes = Number(minMatch[1]);
        const elapsedMs = Date.now() - createdAt;
        durationMs = elapsedMs + remainingMinutes * 60 * 1000;
      }

      return new Date(createdAt + durationMs);
    },
    'quick'
  );
}

/**
 * Get an active quick poll by message ID
 */
export function getActivePoll(messageId: string) {
  return quickPollManager.get(messageId);
}

// Export the manager for direct access if needed
export { quickPollManager };
