import { client } from '../client.js';
import { config } from '../../shared/config/config.js';
import type { Message, MessageReaction, User } from 'discord.js';

export const POLL_EMOJIS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

export interface BasePollOption {
  emoji: string;
  votes: string[];
}

/**
 * Format remaining time as a human-readable string.
 */
export function formatRemainingTime(ms: number): string {
  if (ms <= 0) return '0 minutes';
  const totalMinutes = Math.ceil(ms / 60_000);
  if (totalMinutes < 60) return `${totalMinutes} minute${totalMinutes !== 1 ? 's' : ''}`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (minutes === 0) return `${hours} hour${hours !== 1 ? 's' : ''}`;
  return `${hours}h ${minutes}m`;
}

/**
 * Start close timer and countdown interval for a poll.
 */
export function startPollTimers(
  expiresAt: Date,
  onClose: () => void,
  onUpdate: () => Promise<void>,
): { closeTimer: ReturnType<typeof setTimeout>; countdownTimer: ReturnType<typeof setInterval> } | null {
  const remaining = expiresAt.getTime() - Date.now();
  if (remaining <= 0) {
    onClose();
    return null;
  }

  const closeTimer = setTimeout(onClose, remaining);
  const countdownTimer = setInterval(() => onUpdate().catch(() => {}), 60_000);
  return { closeTimer, countdownTimer };
}

/**
 * Clear all timers for a poll.
 */
export function clearPollTimers(timers: { closeTimer?: ReturnType<typeof setTimeout>; countdownTimer?: ReturnType<typeof setInterval> }): void {
  if (timers.closeTimer) clearTimeout(timers.closeTimer);
  if (timers.countdownTimer) clearInterval(timers.countdownTimer);
}

/**
 * Handle vote toggle (add/remove user from option votes).
 */
export function handleVoteToggle(option: BasePollOption, userId: string, added: boolean): void {
  if (added) {
    if (!option.votes.includes(userId)) {
      option.votes.push(userId);
    }
  } else {
    const index = option.votes.indexOf(userId);
    if (index > -1) {
      option.votes.splice(index, 1);
    }
  }
}

/**
 * Fetch a message from the configured Discord channel.
 */
export async function fetchPollMessage(messageId: string): Promise<Message | null> {
  try {
    const channel = await client.channels.fetch(config.discord.channelId);
    if (!channel || !channel.isTextBased()) return null;
    return await (channel as any).messages.fetch(messageId);
  } catch {
    return null;
  }
}
