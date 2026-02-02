import { client } from '../client.js';
import { EmbedBuilder, TextChannel, MessageReaction, User, Message } from 'discord.js';
import { config } from '../../shared/config/config.js';
import { updateSetting, getSetting } from '../../shared/utils/settingsManager.js';
import { convertTimeToUnixTimestamp, COLORS } from '../embeds/embed.js';
import type { ScheduleResult } from '../../shared/types/types.js';
import { logger, getErrorMessage } from '../../shared/utils/logger.js';
import { formatRemainingTime, startPollTimers as startTimers, clearPollTimers as clearTimers, handleVoteToggle, fetchPollMessage, POLL_EMOJIS } from './pollBase.js';
import { timeToMinutes, minutesToTime } from '../../shared/utils/dateFormatter.js';

interface TrainingPollOption {
  emoji: string;
  timeStr: string; // Raw HH:MM for internal use
  timestamp: number; // Unix timestamp for Discord display
  votes: string[]; // User IDs
}

interface TrainingPoll {
  messageId: string;
  date: string;
  options: TrainingPollOption[];
  expiresAt: Date;
  closeTimer?: ReturnType<typeof setTimeout>;
  countdownTimer?: ReturnType<typeof setInterval>;
}

const activeTrainingPolls = new Map<string, TrainingPoll>();

/**
 * Start close timer and countdown interval for a poll.
 */
function startPollTimers(poll: TrainingPoll): void {
  const timers = startTimers(
    poll.expiresAt,
    () => closeTrainingPoll(poll.messageId),
    () => updateTrainingPollEmbed(poll),
  );
  if (timers) {
    poll.closeTimer = timers.closeTimer;
    poll.countdownTimer = timers.countdownTimer;
  }
}

/**
 * Clear all timers for a poll.
 */
function clearPollTimers(poll: TrainingPoll): void {
  clearTimers(poll);
}

/**
 * Creates a reaction-based poll asking when to start training.
 * Uses Discord timestamps so each user sees times in their local timezone.
 */
export async function createTrainingStartPoll(
  scheduleResult: ScheduleResult,
  date: string
): Promise<void> {
  if (!config.scheduling.trainingStartPollEnabled) {
    return;
  }

  // Only create poll if training can proceed
  if (!scheduleResult.canProceed || !scheduleResult.commonTimeRange) {
    return;
  }

  // Get poll duration from settings (in minutes)
  let pollDurationMinutes = getSetting('scheduling', 'pollDurationMinutes') || 60;

  // Cap poll duration so it closes at least 30 minutes before the common time window starts
  const timeRange = scheduleResult.commonTimeRange;
  const windowStartTimestamp = convertTimeToUnixTimestamp(date, timeRange.start, config.scheduling.timezone);
  const msUntil30MinBefore = (windowStartTimestamp * 1000) - 30 * 60 * 1000 - Date.now();

  if (msUntil30MinBefore <= 0) {
    logger.info('Training start poll skipped: less than 30 minutes until time window starts');
    return;
  }

  const maxDurationMinutes = Math.floor(msUntil30MinBefore / 60_000);
  if (maxDurationMinutes < 1) {
    logger.info('Training start poll skipped: not enough time for a meaningful poll');
    return;
  }

  if (pollDurationMinutes > maxDurationMinutes) {
    logger.info(`Training start poll duration capped: ${pollDurationMinutes}min → ${maxDurationMinutes}min (30min before window at ${timeRange.start})`);
    pollDurationMinutes = maxDurationMinutes;
  }

  const channel = await client.channels.fetch(config.discord.channelId);
  if (!channel || !(channel instanceof TextChannel)) {
    logger.error('Could not find text channel for training start poll');
    return;
  }

  const startMinutes = timeToMinutes(timeRange.start);
  const endMinutes = timeToMinutes(timeRange.end);

  // Generate time options (every 30 minutes within the available window)
  const maxOptions = 10;

  // Calculate interval based on duration to fit within max options
  let intervalMinutes = 30;
  const possibleSlots = Math.floor((endMinutes - startMinutes) / intervalMinutes);

  if (possibleSlots > maxOptions) {
    intervalMinutes = 60;
  }

  const options: TrainingPollOption[] = [];

  for (let minutes = startMinutes; minutes <= endMinutes - 60; minutes += intervalMinutes) {
    if (options.length >= maxOptions) break;

    const timeStr = minutesToTime(minutes);
    const timestamp = convertTimeToUnixTimestamp(date, timeStr, config.scheduling.timezone);

    options.push({
      emoji: POLL_EMOJIS[options.length],
      timeStr,
      timestamp,
      votes: [],
    });
  }

  // If we have less than 3 options, don't create a poll
  if (options.length < 3) {
    logger.info('Not enough time slots for training start poll');
    return;
  }

  try {
    const startTs = convertTimeToUnixTimestamp(date, timeRange.start, config.scheduling.timezone);
    const endTs = convertTimeToUnixTimestamp(date, timeRange.end, config.scheduling.timezone);

    const embed = new EmbedBuilder()
      .setColor(COLORS.WARNING)
      .setTitle('When do you want to start?')
      .setDescription(
        `⏰ Available window: <t:${startTs}:t> - <t:${endTs}:t>\n\nReact to vote!`
      )
      .setFooter({ text: `Poll closes in ${formatRemainingTime(pollDurationMinutes * 60_000)}` })
      .setTimestamp();

    // Layout: divisible by 3 → 3 per row, divisible by 2 → 2 per row (with spacer), else vertical
    const n = options.length;
    const columnsPerRow = n % 3 === 0 ? 3 : n % 2 === 0 ? 2 : n >= 7 ? 3 : n >= 5 ? 2 : 1;

    addPollFields(embed, options.map(opt => ({
      name: `${opt.emoji} <t:${opt.timestamp}:t>`,
      value: '0 votes',
    })), columnsPerRow);

    const message = await channel.send({ embeds: [embed] });

    // Add reactions
    for (const opt of options) {
      await message.react(opt.emoji);
    }

    const poll: TrainingPoll = {
      messageId: message.id,
      date,
      options,
      expiresAt: new Date(Date.now() + pollDurationMinutes * 60 * 1000),
    };

    activeTrainingPolls.set(message.id, poll);
    startPollTimers(poll);

    logger.info(`Training start poll created for ${date} (duration: ${pollDurationMinutes} minutes)`);
  } catch (error) {
    logger.error('Error creating training start poll', getErrorMessage(error));
  }
}

/**
 * Handle reactions on training start polls
 */
export async function handleTrainingPollReaction(
  reaction: MessageReaction,
  user: User,
  added: boolean
): Promise<void> {
  if (user.bot) return;

  const poll = activeTrainingPolls.get(reaction.message.id);
  if (!poll) return;

  const option = poll.options.find(opt => opt.emoji === reaction.emoji.name);
  if (!option) return;

  handleVoteToggle(option, user.id, added);

  await updateTrainingPollEmbed(poll);
}

async function updateTrainingPollEmbed(poll: TrainingPoll): Promise<void> {
  try {
    const channel = await client.channels.fetch(config.discord.channelId);
    if (!channel || !channel.isTextBased()) return;

    const message = await channel.messages.fetch(poll.messageId);
    const embed = message.embeds[0];
    if (!embed) return;

    const newEmbed = EmbedBuilder.from(embed);
    newEmbed.setFields([]);

    const n = poll.options.length;
    const columnsPerRow = n % 3 === 0 ? 3 : n % 2 === 0 ? 2 : n >= 7 ? 3 : n >= 5 ? 2 : 1;

    addPollFields(newEmbed, poll.options.map(opt => ({
      name: `${opt.emoji} <t:${opt.timestamp}:t>`,
      value: `${opt.votes.length} vote${opt.votes.length !== 1 ? 's' : ''}`,
    })), columnsPerRow);

    // Update footer with remaining time
    const remaining = poll.expiresAt.getTime() - Date.now();
    if (remaining > 0) {
      newEmbed.setFooter({ text: `Poll closes in ${formatRemainingTime(remaining)}` });
    }

    await message.edit({ embeds: [newEmbed] });
  } catch (error) {
    logger.error('Error updating training poll embed', getErrorMessage(error));
  }
}

async function closeTrainingPoll(messageId: string): Promise<void> {
  const poll = activeTrainingPolls.get(messageId);
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
    let winnerTimestamp: number;

    if (totalVotes === 0) {
      // No votes — pick the middle option
      const middleIndex = Math.floor(poll.options.length / 2);
      winnerTimestamp = poll.options[middleIndex].timestamp;
      resultText += `No votes received — middle time selected.\n`;
    } else {
      // Show top 3 (or fewer if they have 0 votes)
      const medals = ['🥇', '🥈', '🥉'];
      const shown = sorted.filter((opt, i) => i === 0 || opt.votes.length > 0).slice(0, 3);
      shown.forEach((opt, i) => {
        resultText += `${medals[i]} <t:${opt.timestamp}:t> — ${opt.votes.length} vote${opt.votes.length !== 1 ? 's' : ''}\n`;
      });
      winnerTimestamp = sorted[0].timestamp;
    }

    resultText += `\n✅ **Start time:** <t:${winnerTimestamp}:t>`;

    const embed = new EmbedBuilder()
      .setColor(COLORS.ERROR)
      .setTitle('Training Start Poll — CLOSED')
      .setDescription(resultText)
      .setFooter({ text: 'Poll closed' })
      .setTimestamp();

    await message.reactions.removeAll().catch(() => {});
    await message.edit({ embeds: [embed] });
    activeTrainingPolls.delete(messageId);

    logger.info(`Training poll closed for ${poll.date} - Winner timestamp: ${winnerTimestamp}`);
  } catch (error) {
    logger.error('Error closing training poll', getErrorMessage(error));
  }
}

/**
 * Recover open training polls from channel after bot restart.
 * Scans recent messages for open training poll embeds and re-registers them.
 */
export async function recoverTrainingPolls(): Promise<void> {
  try {
    const channel = await client.channels.fetch(config.discord.channelId);
    if (!channel || !(channel instanceof TextChannel)) return;

    const messages = await channel.messages.fetch({ limit: 50 });
    for (const message of messages.values()) {
      if (!message.author.bot || message.author.id !== client.user?.id) continue;

      const embed = message.embeds[0];
      if (!embed) continue;

      // Identify open training polls by title
      if (embed.title !== 'When do you want to start?') continue;

      // Already tracked
      if (activeTrainingPolls.has(message.id)) continue;

      // Parse expiry from footer — check if already closed
      const footerText = embed.footer?.text || '';
      if (footerText === 'Poll closed') continue;

      // Try to recover the expiry time from the embed timestamp + poll duration
      const pollDurationMinutes = getSetting('scheduling', 'pollDurationMinutes') || 60;
      const createdAt = message.createdTimestamp;
      const expiresAt = new Date(createdAt + pollDurationMinutes * 60 * 1000);

      // If already expired, close it now
      if (expiresAt.getTime() <= Date.now()) {
        // Reconstruct poll to close it properly
        const options = reconstructOptionsFromMessage(message);
        if (options.length === 0) continue;

        const poll: TrainingPoll = {
          messageId: message.id,
          date: '',
          options,
          expiresAt,
        };
        activeTrainingPolls.set(message.id, poll);
        await closeTrainingPoll(message.id);
        logger.info(`Recovered and closed expired training poll: ${message.id}`);
        continue;
      }

      // Still active — reconstruct and re-register
      const options = reconstructOptionsFromMessage(message);
      if (options.length === 0) continue;

      const poll: TrainingPoll = {
        messageId: message.id,
        date: '',
        options,
        expiresAt,
      };

      activeTrainingPolls.set(message.id, poll);
      startPollTimers(poll);
      logger.info(`Recovered active training poll: ${message.id} (closes in ${formatRemainingTime(expiresAt.getTime() - Date.now())})`);
    }
  } catch (error) {
    logger.error('Error recovering training polls', getErrorMessage(error));
  }
}

/**
 * Reconstruct poll options from a message's reactions and embed fields.
 */
function reconstructOptionsFromMessage(message: Message): TrainingPollOption[] {
  const options: TrainingPollOption[] = [];
  const embed = message.embeds[0];
  if (!embed || !embed.fields) return options;

  // Filter out spacer fields
  const realFields = embed.fields.filter(f => f.name !== '\u200b');

  for (let i = 0; i < realFields.length; i++) {
    const field = realFields[i];
    const emoji = POLL_EMOJIS[i];
    if (!emoji) break;

    // Extract timestamp from field name like "1️⃣ <t:1234567890:t>"
    const tsMatch = field.name.match(/<t:(\d+):t>/);
    const timestamp = tsMatch ? Number(tsMatch[1]) : 0;

    // Get votes from reactions
    const reaction = message.reactions.cache.find(r => r.emoji.name === emoji);
    const voteCount = reaction ? Math.max(0, reaction.count - 1) : 0; // -1 for bot's own reaction

    options.push({
      emoji,
      timeStr: '',
      timestamp,
      votes: Array(voteCount).fill('unknown'), // Placeholder IDs — we can't recover exact user IDs from reactions without fetching them
    });
  }

  return options;
}

/**
 * Toggle the training start poll feature on/off
 */
export async function toggleTrainingStartPoll(): Promise<boolean> {
  const currentState = getSetting('scheduling', 'trainingStartPollEnabled');
  const newState = !currentState;

  // Save to settings.json (persistent)
  updateSetting('scheduling', 'trainingStartPollEnabled', newState);

  // Update runtime config
  config.scheduling.trainingStartPollEnabled = newState;

  return newState;
}

/**
 * Get current state of training start poll feature
 */
export function isTrainingStartPollEnabled(): boolean {
  return getSetting('scheduling', 'trainingStartPollEnabled');
}

/**
 * Check if a message is an active training poll
 */
export function getActiveTrainingPoll(messageId: string): TrainingPoll | undefined {
  return activeTrainingPolls.get(messageId);
}

// Helper functions

/**
 * Add fields to an embed with a specific number of columns per row.
 * For 2-column layout, inserts an invisible spacer field as the 3rd column.
 * For 1-column layout, fields are not inline.
 */
function addPollFields(
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

  // 2-column layout: insert a blank spacer every 2 fields to fill the 3rd column
  fields.forEach((f, i) => {
    embed.addFields({ ...f, inline: true });
    if (i % 2 === 1) {
      embed.addFields({ name: '\u200b', value: '\u200b', inline: true });
    }
  });
}

