/**
 * Unified Poll Manager
 * Provides a generic framework for managing polls with shared functionality
 * Reduces duplication between quick polls and training start polls
 */

import { EmbedBuilder, Message, MessageReaction, User, TextChannel } from 'discord.js';
import { client } from '../client.js';
import { config } from '../../shared/config/config.js';
import { logger, getErrorMessage } from '../../shared/utils/logger.js';
import { COLORS } from '../embeds/embed.js';
import {
  formatRemainingTime,
  startPollTimers as startTimersBase,
  clearPollTimers as clearTimersBase,
  handleVoteToggle,
  POLL_EMOJIS,
  type BasePollOption,
} from './pollBase.js';

/**
 * Generic poll option interface
 */
export interface PollOption extends BasePollOption {
  label: string;
  displayValue?: string; // For training polls: Discord timestamp display
}

/**
 * Generic poll interface
 */
export interface Poll<T extends PollOption = PollOption> {
  messageId: string;
  title: string;
  options: T[];
  expiresAt: Date;
  type: 'quick' | 'training';
  metadata?: Record<string, unknown>;
  closeTimer?: ReturnType<typeof setTimeout>;
  countdownTimer?: ReturnType<typeof setInterval>;
}

/**
 * Configuration for poll display
 */
export interface PollDisplayConfig {
  /** Embed color */
  color: number;
  /** Description text (can include placeholders) */
  description: string;
  /** Title suffix when closed */
  closedSuffix: string;
  /** Winner label prefix */
  winnerPrefix: string;
  /** No votes message */
  noVotesMessage: string;
  /** Get display value for an option (for results) */
  getOptionDisplay: (option: PollOption) => string;
  /** Custom winner selection when no votes (optional) */
  selectDefaultWinner?: (options: PollOption[]) => PollOption;
}

/**
 * Poll Manager - handles the lifecycle of polls generically
 */
export class PollManager<T extends PollOption = PollOption> {
  private activePolls = new Map<string, Poll<T>>();
  private displayConfig: PollDisplayConfig;

  constructor(displayConfig: PollDisplayConfig) {
    this.displayConfig = displayConfig;
  }

  /**
   * Start timers for a poll
   */
  startTimers(poll: Poll<T>): void {
    const timers = startTimersBase(
      poll.expiresAt,
      () => this.closePoll(poll.messageId),
      () => this.updateEmbed(poll),
    );
    if (timers) {
      poll.closeTimer = timers.closeTimer;
      poll.countdownTimer = timers.countdownTimer;
    }
  }

  /**
   * Clear timers for a poll
   */
  clearTimers(poll: Poll<T>): void {
    clearTimersBase(poll);
  }

  /**
   * Register a poll (called after sending message)
   */
  register(poll: Poll<T>): void {
    this.activePolls.set(poll.messageId, poll);
    this.startTimers(poll);
  }

  /**
   * Get an active poll by message ID
   */
  get(messageId: string): Poll<T> | undefined {
    return this.activePolls.get(messageId);
  }

  /**
   * Handle a reaction on a poll
   */
  async handleReaction(reaction: MessageReaction, user: User, added: boolean): Promise<void> {
    if (user.bot) return;

    const poll = this.activePolls.get(reaction.message.id);
    if (!poll) return;

    const option = poll.options.find(opt => opt.emoji === reaction.emoji.name);
    if (!option) return;

    handleVoteToggle(option, user.id, added);
    await this.updateEmbed(poll);
  }

  /**
   * Update the poll embed with current vote counts
   */
  async updateEmbed(poll: Poll<T>): Promise<void> {
    try {
      const channel = await client.channels.fetch(config.discord.channelId);
      if (!channel || !channel.isTextBased()) return;

      const message = await channel.messages.fetch(poll.messageId);
      const embed = message.embeds[0];
      if (!embed) return;

      const newEmbed = EmbedBuilder.from(embed);
      newEmbed.setFields([]);

      // Calculate columns per row for layout
      const n = poll.options.length;
      const columnsPerRow = n % 3 === 0 ? 3 : n % 2 === 0 ? 2 : n >= 7 ? 3 : n >= 5 ? 2 : 1;

      this.addFields(newEmbed, poll.options.map(opt => ({
        name: `${opt.emoji} ${opt.displayValue || opt.label}`,
        value: `${opt.votes.length} vote${opt.votes.length !== 1 ? 's' : ''}`,
      })), columnsPerRow);

      // Update footer with remaining time
      const remaining = poll.expiresAt.getTime() - Date.now();
      if (remaining > 0) {
        newEmbed.setFooter({ text: `Poll closes in ${formatRemainingTime(remaining)}` });
      }

      await message.edit({ embeds: [newEmbed] });
    } catch (error) {
      logger.error('Error updating poll embed', getErrorMessage(error));
    }
  }

  /**
   * Close a poll and display results
   */
  async closePoll(messageId: string): Promise<void> {
    const poll = this.activePolls.get(messageId);
    if (!poll) return;

    this.clearTimers(poll);

    try {
      const channel = await client.channels.fetch(config.discord.channelId);
      if (!channel || !channel.isTextBased()) return;

      const message = await channel.messages.fetch(messageId);

      // Sort options by votes
      const sorted = [...poll.options].sort((a, b) => b.votes.length - a.votes.length);
      const totalVotes = sorted.reduce((sum, opt) => sum + opt.votes.length, 0);

      let resultText = '**📊 Results:**\n\n';
      let winner: PollOption;

      if (totalVotes === 0) {
        // No votes - use default winner selection or first option
        winner = this.displayConfig.selectDefaultWinner
          ? this.displayConfig.selectDefaultWinner(poll.options)
          : sorted[0];
        resultText += `${this.displayConfig.noVotesMessage}\n`;
      } else {
        // Show top 3 (or fewer if they have 0 votes)
        const medals = ['🥇', '🥈', '🥉'];
        const shown = sorted.filter((opt, i) => i === 0 || opt.votes.length > 0).slice(0, 3);
        shown.forEach((opt, i) => {
          const display = this.displayConfig.getOptionDisplay(opt);
          resultText += `${medals[i]} **${display}** — ${opt.votes.length} vote${opt.votes.length !== 1 ? 's' : ''}\n`;
        });
        winner = sorted[0];
      }

      const winnerDisplay = this.displayConfig.getOptionDisplay(winner);
      if (totalVotes > 0 || this.displayConfig.selectDefaultWinner) {
        resultText += `\n✅ **${this.displayConfig.winnerPrefix}:** ${winnerDisplay}`;
      }

      const embed = new EmbedBuilder()
        .setColor(COLORS.ERROR)
        .setTitle(`${poll.title} ${this.displayConfig.closedSuffix}`)
        .setDescription(resultText)
        .setFooter({ text: 'Poll closed' })
        .setTimestamp();

      await message.reactions.removeAll().catch(() => {});
      await message.edit({ embeds: [embed] });
      this.activePolls.delete(messageId);

      logger.info(`Poll closed: ${poll.title} - Winner: ${winnerDisplay}`);
    } catch (error) {
      logger.error('Error closing poll', getErrorMessage(error));
    }
  }

  /**
   * Create an embed for a new poll
   */
  createEmbed(title: string, options: T[], durationMs: number): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setColor(this.displayConfig.color)
      .setTitle(title)
      .setDescription(this.displayConfig.description)
      .setFooter({ text: `Poll closes in ${formatRemainingTime(durationMs)}` })
      .setTimestamp();

    const n = options.length;
    const columnsPerRow = n % 3 === 0 ? 3 : n % 2 === 0 ? 2 : n >= 7 ? 3 : n >= 5 ? 2 : 1;

    this.addFields(embed, options.map(opt => ({
      name: `${opt.emoji} ${opt.displayValue || opt.label}`,
      value: '0 votes',
    })), columnsPerRow);

    return embed;
  }

  /**
   * Add fields to an embed with a specific number of columns per row
   */
  addFields(
    embed: EmbedBuilder,
    fields: Array<{ name: string; value: string }>,
    columnsPerRow: number
  ): void {
    if (columnsPerRow === 1) {
      fields.forEach(f => embed.addFields({ ...f, inline: false }));
      return;
    }

    if (columnsPerRow === 3) {
      fields.forEach(f => embed.addFields({ ...f, inline: true }));
      return;
    }

    // 2-column layout: insert a blank spacer every 2 fields
    fields.forEach((f, i) => {
      embed.addFields({ ...f, inline: true });
      if (i % 2 === 1) {
        embed.addFields({ name: '\u200b', value: '\u200b', inline: true });
      }
    });
  }

  /**
   * Send a poll message and register it
   */
  async sendPoll(
    title: string,
    options: T[],
    durationMs: number,
    type: 'quick' | 'training',
    metadata?: Record<string, unknown>
  ): Promise<Message> {
    const channel = await client.channels.fetch(config.discord.channelId);
    if (!channel || !channel.isTextBased()) {
      throw new Error('Channel not found or not text-based');
    }

    const embed = this.createEmbed(title, options, durationMs);
    const message = await (channel as TextChannel).send({ embeds: [embed] });

    // Add reactions
    for (const opt of options) {
      await message.react(opt.emoji);
    }

    const poll: Poll<T> = {
      messageId: message.id,
      title,
      options,
      expiresAt: new Date(Date.now() + durationMs),
      type,
      metadata,
    };

    this.register(poll);
    return message;
  }

  /**
   * Recover polls from channel messages (to be called on bot restart)
   */
  async recoverFromChannel(
    identifyPoll: (embed: EmbedBuilder | null, message: Message) => boolean,
    reconstructOptions: (message: Message) => T[],
    getExpiry: (message: Message) => Date,
    type: 'quick' | 'training'
  ): Promise<void> {
    try {
      const channel = await client.channels.fetch(config.discord.channelId);
      if (!channel || !(channel instanceof TextChannel)) return;

      const messages = await channel.messages.fetch({ limit: 50 });
      for (const message of messages.values()) {
        if (!message.author.bot || message.author.id !== client.user?.id) continue;

        const embed = message.embeds[0];
        if (!embed) continue;

        // Check if this is a poll we should recover
        if (!identifyPoll(embed ? EmbedBuilder.from(embed) : null, message)) continue;

        // Already tracked
        if (this.activePolls.has(message.id)) continue;

        // Check if already closed
        const footerText = embed.footer?.text || '';
        if (footerText === 'Poll closed') continue;

        const expiresAt = getExpiry(message);
        const options = reconstructOptions(message);
        if (options.length === 0) continue;

        const poll: Poll<T> = {
          messageId: message.id,
          title: embed.title || 'Unknown',
          options,
          expiresAt,
          type,
        };

        // If already expired, close it now
        if (expiresAt.getTime() <= Date.now()) {
          this.activePolls.set(message.id, poll);
          await this.closePoll(message.id);
          logger.info(`Recovered and closed expired ${type} poll: ${message.id}`);
          continue;
        }

        this.activePolls.set(message.id, poll);
        this.startTimers(poll);
        logger.info(`Recovered active ${type} poll: ${message.id} (closes in ${formatRemainingTime(expiresAt.getTime() - Date.now())})`);
      }
    } catch (error) {
      logger.error(`Error recovering ${type} polls`, getErrorMessage(error));
    }
  }

  /**
   * Check if a message ID is an active poll
   */
  has(messageId: string): boolean {
    return this.activePolls.has(messageId);
  }

  /**
   * Get all active polls
   */
  getAll(): Map<string, Poll<T>> {
    return this.activePolls;
  }
}

// Re-export commonly used items
export { POLL_EMOJIS, formatRemainingTime };
