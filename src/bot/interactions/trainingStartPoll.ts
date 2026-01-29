import { client } from '../client.js';
import { EmbedBuilder, TextChannel, MessageReaction, User } from 'discord.js';
import { config } from '../../shared/config/config.js';
import { updateSetting, getSetting } from '../../shared/utils/settingsManager.js';
import { convertTimeToUnixTimestamp } from '../embeds/embed.js';
import type { ScheduleResult } from '../../shared/types/types.js';

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
}

const activeTrainingPolls = new Map<string, TrainingPoll>();

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
  const pollDurationMinutes = getSetting('scheduling', 'pollDurationMinutes') || 60;

  const channel = await client.channels.fetch(config.discord.channelId);
  if (!channel || !(channel instanceof TextChannel)) {
    console.error('Could not find text channel for training start poll');
    return;
  }

  const timeRange = scheduleResult.commonTimeRange;
  const startMinutes = timeToMinutes(timeRange.start);
  const endMinutes = timeToMinutes(timeRange.end);

  // Generate time options (every 30 minutes within the available window)
  const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
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
      emoji: emojis[options.length],
      timeStr,
      timestamp,
      votes: [],
    });
  }

  // If we have less than 3 options, don't create a poll
  if (options.length < 3) {
    console.log('Not enough time slots for training start poll');
    return;
  }

  try {
    const startTs = convertTimeToUnixTimestamp(date, timeRange.start, config.scheduling.timezone);
    const endTs = convertTimeToUnixTimestamp(date, timeRange.end, config.scheduling.timezone);

    const embed = new EmbedBuilder()
      .setColor(0xf39c12)
      .setTitle('When do you want to start?')
      .setDescription(
        `⏰ Available window: <t:${startTs}:t> - <t:${endTs}:t>\n\nReact to vote!`
      )
      .setFooter({ text: `Poll closes in ${pollDurationMinutes} minute(s)` })
      .setTimestamp();

    // Use inline layout only when options divide evenly into rows of 3
    const useInline = options.length % 3 === 0;

    options.forEach(opt => {
      embed.addFields({
        name: `${opt.emoji} <t:${opt.timestamp}:t>`,
        value: '0 votes',
        inline: useInline,
      });
    });

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

    // Auto-close after duration
    setTimeout(() => closeTrainingPoll(message.id), pollDurationMinutes * 60 * 1000);

    console.log(`Training start poll created for ${date} (duration: ${pollDurationMinutes} minutes)`);
  } catch (error) {
    console.error('Error creating training start poll:', error);
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

    const useInline = poll.options.length % 3 === 0;

    poll.options.forEach(opt => {
      newEmbed.addFields({
        name: `${opt.emoji} <t:${opt.timestamp}:t>`,
        value: `${opt.votes.length} vote${opt.votes.length !== 1 ? 's' : ''}`,
        inline: useInline,
      });
    });

    await message.edit({ embeds: [newEmbed] });
  } catch (error) {
    console.error('Error updating training poll embed:', error);
  }
}

async function closeTrainingPoll(messageId: string): Promise<void> {
  const poll = activeTrainingPolls.get(messageId);
  if (!poll) return;

  try {
    const channel = await client.channels.fetch(config.discord.channelId);
    if (!channel || !channel.isTextBased()) return;

    const message = await channel.messages.fetch(messageId);

    // Sort options by votes
    const sorted = [...poll.options].sort((a, b) => b.votes.length - a.votes.length);

    let resultText = '**📊 Results:**\n\n';
    sorted.forEach((opt, i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '  ';
      resultText += `${medal} ${opt.emoji} <t:${opt.timestamp}:t>: ${opt.votes.length} vote${opt.votes.length !== 1 ? 's' : ''}\n`;
    });

    if (sorted[0].votes.length > 0) {
      resultText += `\n✅ **Start time:** <t:${sorted[0].timestamp}:t>`;
    }

    const embed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle('Training Start Poll — CLOSED')
      .setDescription(resultText)
      .setFooter({ text: 'Poll closed' })
      .setTimestamp();

    await message.edit({ embeds: [embed] });
    activeTrainingPolls.delete(messageId);

    console.log(`Training poll closed for ${poll.date} - Winner: ${sorted[0].timeStr}`);
  } catch (error) {
    console.error('Error closing training poll:', error);
  }
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
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}
