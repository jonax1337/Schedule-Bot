import { prisma } from './database.repository.js';
import { logger } from '../shared/utils/logger.js';

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export interface RecurringAvailabilityData {
  id: number;
  userId: string;
  dayOfWeek: number;
  availability: string;
  active: boolean;
}

/**
 * Get all recurring availabilities for a user
 */
export async function getRecurringForUser(userId: string): Promise<RecurringAvailabilityData[]> {
  const records = await prisma.recurringAvailability.findMany({
    where: { userId },
    orderBy: { dayOfWeek: 'asc' },
  });

  return records.map(r => ({
    id: r.id,
    userId: r.userId,
    dayOfWeek: r.dayOfWeek,
    availability: r.availability,
    active: r.active,
  }));
}

/**
 * Get all active recurring availabilities for a specific day of week
 */
export async function getActiveRecurringForDay(dayOfWeek: number): Promise<RecurringAvailabilityData[]> {
  const records = await prisma.recurringAvailability.findMany({
    where: { dayOfWeek, active: true },
  });

  return records.map(r => ({
    id: r.id,
    userId: r.userId,
    dayOfWeek: r.dayOfWeek,
    availability: r.availability,
    active: r.active,
  }));
}

/**
 * Get active recurring availability for a specific user and day
 */
export async function getRecurringForUserAndDay(
  userId: string,
  dayOfWeek: number
): Promise<RecurringAvailabilityData | null> {
  const record = await prisma.recurringAvailability.findUnique({
    where: { userId_dayOfWeek: { userId, dayOfWeek } },
  });

  if (!record) return null;

  return {
    id: record.id,
    userId: record.userId,
    dayOfWeek: record.dayOfWeek,
    availability: record.availability,
    active: record.active,
  };
}

/**
 * Set recurring availability for a user on a specific day of week.
 * Uses upsert to create or update.
 */
export async function setRecurring(
  userId: string,
  dayOfWeek: number,
  availability: string
): Promise<RecurringAvailabilityData> {
  const record = await prisma.recurringAvailability.upsert({
    where: { userId_dayOfWeek: { userId, dayOfWeek } },
    create: {
      userId,
      dayOfWeek,
      availability,
      active: true,
    },
    update: {
      availability,
      active: true,
    },
  });

  logger.info('Recurring availability set', `${userId} → ${WEEKDAY_NAMES[dayOfWeek]}: ${availability}`);

  return {
    id: record.id,
    userId: record.userId,
    dayOfWeek: record.dayOfWeek,
    availability: record.availability,
    active: record.active,
  };
}

/**
 * Remove recurring availability for a user on a specific day
 */
export async function removeRecurring(userId: string, dayOfWeek: number): Promise<boolean> {
  try {
    await prisma.recurringAvailability.delete({
      where: { userId_dayOfWeek: { userId, dayOfWeek } },
    });
    logger.info('Recurring availability removed', `${userId} → ${WEEKDAY_NAMES[dayOfWeek]}`);
    return true;
  } catch {
    return false;
  }
}

/**
 * Remove all recurring availabilities for a user
 */
export async function removeAllRecurringForUser(userId: string): Promise<number> {
  const result = await prisma.recurringAvailability.deleteMany({
    where: { userId },
  });
  logger.info('All recurring availabilities removed', `${userId} (${result.count} entries)`);
  return result.count;
}

/**
 * Toggle active state for a recurring entry
 */
export async function toggleRecurringActive(userId: string, dayOfWeek: number): Promise<RecurringAvailabilityData | null> {
  const existing = await prisma.recurringAvailability.findUnique({
    where: { userId_dayOfWeek: { userId, dayOfWeek } },
  });

  if (!existing) return null;

  const updated = await prisma.recurringAvailability.update({
    where: { id: existing.id },
    data: { active: !existing.active },
  });

  return {
    id: updated.id,
    userId: updated.userId,
    dayOfWeek: updated.dayOfWeek,
    availability: updated.availability,
    active: updated.active,
  };
}

/**
 * Get all active recurring entries (used during schedule seeding)
 */
export async function getAllActiveRecurring(): Promise<RecurringAvailabilityData[]> {
  const records = await prisma.recurringAvailability.findMany({
    where: { active: true },
    orderBy: [{ userId: 'asc' }, { dayOfWeek: 'asc' }],
  });

  return records.map(r => ({
    id: r.id,
    userId: r.userId,
    dayOfWeek: r.dayOfWeek,
    availability: r.availability,
    active: r.active,
  }));
}
