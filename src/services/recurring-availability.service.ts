import {
  getRecurringForUser,
  setRecurring,
  removeRecurring,
  removeAllRecurringForUser,
  toggleRecurringActive,
  type RecurringAvailabilityData,
} from '../repositories/recurring-availability.repository.js';
import { getUserMapping } from '../repositories/user-mapping.repository.js';
import { logger } from '../shared/utils/logger.js';

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Validate availability format: "HH:MM-HH:MM" or "x"
 */
function isValidAvailability(value: string): boolean {
  if (value.toLowerCase() === 'x') return true;
  const timeRangePattern = /^\d{2}:\d{2}-\d{2}:\d{2}$/;
  if (!timeRangePattern.test(value)) return false;

  const [start, end] = value.split('-');
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);

  if (startH < 0 || startH > 23 || startM < 0 || startM > 59) return false;
  if (endH < 0 || endH > 23 || endM < 0 || endM > 59) return false;

  return true;
}

class RecurringAvailabilityService {
  /**
   * Get all recurring entries for a user
   */
  async getForUser(userId: string): Promise<RecurringAvailabilityData[]> {
    return getRecurringForUser(userId);
  }

  /**
   * Set recurring availability for a user on a day of week
   */
  async set(
    userId: string,
    dayOfWeek: number,
    availability: string,
    requestingUserId?: string
  ): Promise<{ success: boolean; data?: RecurringAvailabilityData; error?: string }> {
    // Validate day of week
    if (dayOfWeek < 0 || dayOfWeek > 6) {
      return { success: false, error: 'Invalid day of week (0-6)' };
    }

    // Validate availability format
    if (!isValidAvailability(availability)) {
      return { success: false, error: 'Invalid availability format. Use "HH:MM-HH:MM" or "x"' };
    }

    // Verify user exists in mappings
    const mapping = await getUserMapping(userId);
    if (!mapping) {
      return { success: false, error: 'User is not registered in the roster' };
    }

    // Authorization: users can only set their own recurring schedule
    if (requestingUserId && requestingUserId !== userId) {
      return { success: false, error: 'You can only manage your own recurring schedule' };
    }

    const data = await setRecurring(userId, dayOfWeek, availability);
    return { success: true, data };
  }

  /**
   * Set multiple days at once (e.g., "Mon-Fri 18:00-22:00")
   */
  async setBulk(
    userId: string,
    days: number[],
    availability: string,
    requestingUserId?: string
  ): Promise<{ success: boolean; count?: number; error?: string }> {
    if (!isValidAvailability(availability)) {
      return { success: false, error: 'Invalid availability format. Use "HH:MM-HH:MM" or "x"' };
    }

    const mapping = await getUserMapping(userId);
    if (!mapping) {
      return { success: false, error: 'User is not registered in the roster' };
    }

    if (requestingUserId && requestingUserId !== userId) {
      return { success: false, error: 'You can only manage your own recurring schedule' };
    }

    let count = 0;
    for (const day of days) {
      if (day < 0 || day > 6) continue;
      await setRecurring(userId, day, availability);
      count++;
    }

    logger.info('Bulk recurring set', `${userId}: ${count} days → ${availability}`);
    return { success: true, count };
  }

  /**
   * Remove recurring availability for a specific day
   */
  async remove(
    userId: string,
    dayOfWeek: number,
    requestingUserId?: string
  ): Promise<{ success: boolean; error?: string }> {
    if (requestingUserId && requestingUserId !== userId) {
      return { success: false, error: 'You can only manage your own recurring schedule' };
    }

    const removed = await removeRecurring(userId, dayOfWeek);
    if (!removed) {
      return { success: false, error: `No recurring entry for ${WEEKDAY_NAMES[dayOfWeek]}` };
    }

    return { success: true };
  }

  /**
   * Remove all recurring entries for a user
   */
  async removeAll(
    userId: string,
    requestingUserId?: string
  ): Promise<{ success: boolean; count?: number; error?: string }> {
    if (requestingUserId && requestingUserId !== userId) {
      return { success: false, error: 'You can only manage your own recurring schedule' };
    }

    const count = await removeAllRecurringForUser(userId);
    return { success: true, count };
  }

  /**
   * Toggle active/inactive for a specific day
   */
  async toggle(
    userId: string,
    dayOfWeek: number,
    requestingUserId?: string
  ): Promise<{ success: boolean; data?: RecurringAvailabilityData; error?: string }> {
    if (requestingUserId && requestingUserId !== userId) {
      return { success: false, error: 'You can only manage your own recurring schedule' };
    }

    const data = await toggleRecurringActive(userId, dayOfWeek);
    if (!data) {
      return { success: false, error: `No recurring entry for ${WEEKDAY_NAMES[dayOfWeek]}` };
    }

    return { success: true, data };
  }
}

export const recurringAvailabilityService = new RecurringAvailabilityService();
