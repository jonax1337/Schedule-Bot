import { client } from '../client.js';
import { EmbedBuilder, TextChannel, MessageReaction, User, Message } from 'discord.js';
import { config } from '../../shared/config/config.js';
import { updateSetting, getSetting } from '../../shared/utils/settingsManager.js';
import { convertTimeToUnixTimestamp, COLORS } from '../embeds/embed.js';
import type { ScheduleResult } from '../../shared/types/types.js';
import { logger, getErrorMessage } from '../../shared/utils/logger.js';
import { PollManager, PollOption, POLL_EMOJIS, formatRemainingTime } from './pollManager.js';
import { timeToMinutes, minutesToTime } from '../../shared/utils/dateFormatter.js';

/**
 * Training poll option extends base PollOption with timestamp
 */
interface TrainingPollOption extends PollOption {
  timeStr: string;
  timestamp: number;
}

/**
 * Create the training poll manager with specific display config
 */
const trainingPollManager = new PollManager<TrainingPollOption>({
  color: COLORS.WARNING,
  description: 'React to vote!',
  closedSuffix: '— CLOSED',
  winnerPrefix: 'Start time',
  noVotesMessage: 'No votes received — middle time selected.',
  getOptionDisplay: (opt) => `<t:${(opt as TrainingPollOption).timestamp}:t>`,
  selectDefaultWinner: (options) => {
    // Select middle option when no votes
    const middleIndex = Math.floor(options.length / 2);
    return options[middleIndex];
  },
});

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
      label: timeStr,
      displayValue: `<t:${timestamp}:t>`,
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

    const durationMs = pollDurationMinutes * 60 * 1000;

    // Create custom embed with time window description
    const embed = new EmbedBuilder()
      .setColor(COLORS.WARNING)
      .setTitle('When do you want to start?')
      .setDescription(
        `⏰ Available window: <t:${startTs}:t> - <t:${endTs}:t>\n\nReact to vote!`
      )
      .setFooter({ text: `Poll closes in ${formatRemainingTime(durationMs)}` })
      .setTimestamp();

    // Layout: divisible by 3 → 3 per row, divisible by 2 → 2 per row, else vertical
    const n = options.length;
    const columnsPerRow = n % 3 === 0 ? 3 : n % 2 === 0 ? 2 : n >= 7 ? 3 : n >= 5 ? 2 : 1;

    trainingPollManager.addFields(embed, options.map(opt => ({
      name: `${opt.emoji} <t:${opt.timestamp}:t>`,
      value: '0 votes',
    })), columnsPerRow);

    const message = await channel.send({ embeds: [embed] });

    // Add reactions
    for (const opt of options) {
      await message.react(opt.emoji);
    }

    // Register with poll manager
    trainingPollManager.register({
      messageId: message.id,
      title: 'When do you want to start?',
      options,
      expiresAt: new Date(Date.now() + durationMs),
      type: 'training',
      metadata: { date },
    });

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
  await trainingPollManager.handleReaction(reaction, user, added);
}

/**
 * Recover open training polls from channel after bot restart.
 * Scans recent messages for open training poll embeds and re-registers them.
 */
export async function recoverTrainingPolls(): Promise<void> {
  await trainingPollManager.recoverFromChannel(
    // Identify training polls by title
    (embed) => embed?.data.title === 'When do you want to start?',
    // Reconstruct options from message
    (message) => reconstructOptionsFromMessage(message),
    // Get expiry time
    (message) => {
      const pollDurationMinutes = getSetting('scheduling', 'pollDurationMinutes') || 60;
      return new Date(message.createdTimestamp + pollDurationMinutes * 60 * 1000);
    },
    'training'
  );
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
      label: '',
      displayValue: `<t:${timestamp}:t>`,
      timeStr: '',
      timestamp,
      votes: Array(voteCount).fill('unknown'), // Placeholder IDs
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
export function getActiveTrainingPoll(messageId: string) {
  return trainingPollManager.get(messageId);
}
