import { client } from '../client.js';
import { TextChannel } from 'discord.js';
import { config } from '../../shared/config/config.js';
import { updateSetting, getSetting } from '../../shared/utils/settingsManager.js';
import { convertTimeToUnixTimestamp } from '../embeds/embed.js';
import type { ScheduleResult } from '../../shared/types/types.js';

/**
 * Creates a poll asking when to start training based on the available time window
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
  const pollDurationHours = pollDurationMinutes / 60;

  const channel = await client.channels.fetch(config.discord.channelId);
  if (!channel || !(channel instanceof TextChannel)) {
    console.error('Could not find text channel for training start poll');
    return;
  }

  const timeRange = scheduleResult.commonTimeRange;
  const startMinutes = timeToMinutes(timeRange.start);
  const endMinutes = timeToMinutes(timeRange.end);
  const durationHours = Math.floor((endMinutes - startMinutes) / 60);

  // Generate time options (every 30 minutes within the available window)
  const options: { text: string; emoji: string }[] = [];
  const maxOptions = 10; // Discord poll limit
  
  // Calculate interval based on duration to fit within 10 options
  let intervalMinutes = 30;
  const possibleSlots = Math.floor((endMinutes - startMinutes) / intervalMinutes);
  
  if (possibleSlots > maxOptions) {
    intervalMinutes = 60; // Use 1-hour intervals if too many options
  }

  for (let minutes = startMinutes; minutes <= endMinutes - 60; minutes += intervalMinutes) {
    if (options.length >= maxOptions) break;
    
    const timeStr = minutesToTime(minutes);
    options.push({
      text: timeStr,
      emoji: getTimeEmoji(minutes),
    });
  }

  // If we have less than 3 options, don't create a poll
  if (options.length < 3) {
    console.log('Not enough time slots for training start poll');
    return;
  }

  try {
    // Send a companion message with Discord timestamps so users see times in their local timezone
    const startTs = convertTimeToUnixTimestamp(date, timeRange.start, config.scheduling.timezone);
    const endTs = convertTimeToUnixTimestamp(date, timeRange.end, config.scheduling.timezone);
    await channel.send({
      content: `⏰ Available time window: <t:${startTs}:t> - <t:${endTs}:t>`,
    });

    const pollMessage = await channel.send({
      poll: {
        question: {
          text: `🎮 When do you want to start?`,
        },
        answers: options.map(opt => ({
          text: opt.text,
          emoji: opt.emoji,
        })),
        duration: pollDurationHours,
        allowMultiselect: false,
      },
    });

    console.log(`Training start poll created for ${date} (duration: ${pollDurationMinutes} minutes)`);
  } catch (error) {
    console.error('Error creating training start poll:', error);
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

function getTimeEmoji(minutes: number): string {
  const hour = Math.floor(minutes / 60);
  
  // Clock emojis for different times
  const clockEmojis: { [key: number]: string } = {
    0: '🕛', 1: '🕐', 2: '🕑', 3: '🕒', 4: '🕓', 5: '🕔',
    6: '🕕', 7: '🕖', 8: '🕗', 9: '🕘', 10: '🕙', 11: '🕚',
    12: '🕛', 13: '🕐', 14: '🕑', 15: '🕒', 16: '🕓', 17: '🕔',
    18: '🕕', 19: '🕖', 20: '🕗', 21: '🕘', 22: '🕙', 23: '🕚',
  };
  
  return clockEmojis[hour] || '🕐';
}
