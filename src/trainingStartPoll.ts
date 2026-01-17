import { client } from './bot.js';
import { TextChannel } from 'discord.js';
import { config } from './config.js';
import { updateSetting, getSetting } from './settingsManager.js';
import type { ScheduleResult } from './types.js';

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
    const pollMessage = await channel.send({
      poll: {
        question: {
          text: `🎮 When should we start training? (${durationHours}h available: ${timeRange.start}-${timeRange.end})`,
        },
        answers: options.map(opt => ({
          text: opt.text,
          emoji: opt.emoji,
        })),
        duration: 2, // 2 hours
        allowMultiselect: false,
      },
    });

    console.log(`Training start poll created for ${date}`);
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
