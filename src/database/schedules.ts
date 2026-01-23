import { prisma } from './client.js';
import { getUserMappings } from './userMappings.js';
import type { ScheduleData, SchedulePlayerData } from '../shared/types/types.js';

/**
 * Get schedule for a specific date with all players
 */
export async function getNext14DaysSchedule(): Promise<ScheduleData[]> {
  const schedules: ScheduleData[] = [];
  const today = new Date();
  
  // Use consistent DD.MM.YYYY format
  const formatDate = (d: Date): string => {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  };
  
  for (let i = 0; i < 14; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dateStr = formatDate(date);
    
    const schedule = await getScheduleForDate(dateStr);
    if (schedule) {
      schedules.push(schedule);
    }
  }
  
  return schedules;
}

export async function getScheduleForDate(date: string): Promise<ScheduleData | null> {
  const schedule = await prisma.schedule.findUnique({
    where: { date },
    include: {
      players: {
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  if (!schedule) return null;

  return {
    date: schedule.date,
    players: schedule.players.map(p => ({
      userId: p.userId,
      displayName: p.displayName,
      role: p.role as 'MAIN' | 'SUB' | 'COACH',
      availability: p.availability,
      sortOrder: p.sortOrder,
    })),
    reason: schedule.reason,
    focus: schedule.focus,
  };
}

/**
 * Get schedules for multiple dates
 */
export async function getSchedulesForDates(dates: string[]): Promise<ScheduleData[]> {
  const schedules = await prisma.schedule.findMany({
    where: {
      date: { in: dates },
    },
    include: {
      players: {
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  // Convert DD.MM.YYYY to Date for proper sorting
  const parseGermanDate = (dateStr: string): Date => {
    const [day, month, year] = dateStr.split('.');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  };

  // Sort schedules by actual date (earliest first)
  const sortedSchedules = schedules.sort((a, b) => {
    const dateA = parseGermanDate(a.date);
    const dateB = parseGermanDate(b.date);
    return dateA.getTime() - dateB.getTime();
  });

  return sortedSchedules.map(schedule => ({
    date: schedule.date,
    players: schedule.players.map(p => ({
      userId: p.userId,
      displayName: p.displayName,
      role: p.role as 'MAIN' | 'SUB' | 'COACH',
      availability: p.availability,
      sortOrder: p.sortOrder,
    })),
    reason: schedule.reason,
    focus: schedule.focus,
  }));
}

/**
 * Get next N dates from today
 */
export function getNext14Dates(): string[] {
  const dates: string[] = [];
  const today = new Date();
  
  for (let i = 0; i < 14; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    dates.push(`${day}.${month}.${year}`);
  }
  
  return dates;
}

/**
 * Create or update schedule for a date
 */
export async function upsertSchedule(date: string, reason: string = '', focus: string = ''): Promise<void> {
  await prisma.schedule.upsert({
    where: { date },
    create: {
      date,
      reason,
      focus,
    },
    update: {
      reason,
      focus,
    },
  });
}

/**
 * Update player availability for a specific date
 */
export async function updatePlayerAvailability(
  date: string,
  userId: string,
  availability: string
): Promise<boolean> {
  try {
    // Ensure schedule exists
    await upsertSchedule(date);

    // Check if player entry exists
    const existing = await prisma.schedulePlayer.findFirst({
      where: {
        schedule: { date },
        userId,
      },
    });

    if (existing) {
      // Update existing
      await prisma.schedulePlayer.update({
        where: { id: existing.id },
        data: { availability },
      });
    } else {
      // Create new - get user mapping for display name and sort order
      const userMappings = await getUserMappings();
      const mapping = userMappings.find(m => m.discordId === userId);
      
      if (!mapping) {
        console.error(`No user mapping found for ${userId}`);
        return false;
      }

      const schedule = await prisma.schedule.findUnique({ where: { date } });
      if (!schedule) return false;

      await prisma.schedulePlayer.create({
        data: {
          scheduleId: schedule.id,
          userId,
          displayName: mapping.displayName,
          role: mapping.role.toUpperCase() as 'MAIN' | 'SUB' | 'COACH',
          availability,
          sortOrder: mapping.sortOrder,
        },
      });
    }

    return true;
  } catch (error) {
    console.error('Error updating player availability:', error);
    return false;
  }
}

/**
 * Ensure all dates in next 14 days have schedule entries
 */
export async function addMissingDays(): Promise<void> {
  const dates = getNext14Dates();
  const userMappings = await getUserMappings();

  for (const date of dates) {
    // Ensure schedule exists
    let schedule = await prisma.schedule.findUnique({
      where: { date },
      include: { players: true },
    });

    if (!schedule) {
      schedule = await prisma.schedule.create({
        data: {
          date,
          reason: '',
          focus: '',
        },
        include: { players: true },
      });
    }

    // Ensure all user mappings have player entries
    for (const mapping of userMappings) {
      const existingPlayer = schedule.players.find(p => p.userId === mapping.discordId);
      
      if (!existingPlayer) {
        await prisma.schedulePlayer.create({
          data: {
            scheduleId: schedule.id,
            userId: mapping.discordId,
            displayName: mapping.displayName,
            role: mapping.role.toUpperCase() as 'MAIN' | 'SUB' | 'COACH',
            availability: '',
            sortOrder: mapping.sortOrder,
          },
        });
      }
    }
  }

  console.log(`✅ Ensured schedules exist for next 14 days`);
}

/**
 * Delete old schedules (older than 14 days)
 * DISABLED - All historical data is now preserved
 */
export async function deleteOldRows(): Promise<void> {
  // Function disabled - no longer deleting old schedule data
  // All historical data is preserved in the database
  console.log('deleteOldRows called but disabled - preserving all historical data');
  return;
}

/**
 * Sync user mappings to all schedules
 * Called when user mappings change (add/remove/update)
 */
export async function syncUserMappingsToSchedules(): Promise<void> {
  const dates = getNext14Dates();
  const userMappings = await getUserMappings();

  for (const date of dates) {
    const schedule = await prisma.schedule.findUnique({
      where: { date },
      include: { players: true },
    });

    if (!schedule) continue;

    // Add missing players
    for (const mapping of userMappings) {
      const existingPlayer = schedule.players.find(p => p.userId === mapping.discordId);
      
      if (!existingPlayer) {
        await prisma.schedulePlayer.create({
          data: {
            scheduleId: schedule.id,
            userId: mapping.discordId,
            displayName: mapping.displayName,
            role: mapping.role.toUpperCase() as 'MAIN' | 'SUB' | 'COACH',
            availability: '',
            sortOrder: mapping.sortOrder,
          },
        });
      } else {
        // Update existing player with latest display name and sort order
        await prisma.schedulePlayer.update({
          where: { id: existingPlayer.id },
          data: {
            displayName: mapping.displayName,
            role: mapping.role.toUpperCase() as 'MAIN' | 'SUB' | 'COACH',
            sortOrder: mapping.sortOrder,
          },
        });
      }
    }

    // Remove players that no longer have mappings
    const validUserIds = userMappings.map(m => m.discordId);
    await prisma.schedulePlayer.deleteMany({
      where: {
        scheduleId: schedule.id,
        userId: { notIn: validUserIds },
      },
    });
  }

  console.log('✅ User mappings synced to all schedules');
}

/**
 * Get all schedules (for export/backup)
 */
export async function getAllSchedules(): Promise<ScheduleData[]> {
  const schedules = await prisma.schedule.findMany({
    include: {
      players: {
        orderBy: { sortOrder: 'asc' },
      },
    },
    orderBy: { date: 'asc' },
  });

  return schedules.map(schedule => ({
    date: schedule.date,
    players: schedule.players.map(p => ({
      userId: p.userId,
      displayName: p.displayName,
      role: p.role as 'MAIN' | 'SUB' | 'COACH',
      availability: p.availability,
      sortOrder: p.sortOrder,
    })),
    reason: schedule.reason,
    focus: schedule.focus,
  }));
}

/**
 * Get schedules with pagination (14 days per page)
 * offset: 0 = next 14 days, 1 = previous 14 days, etc.
 */
export async function getSchedulesPaginated(offset: number = 0): Promise<{
  schedules: ScheduleData[];
  hasMore: boolean;
  totalPages: number;
}> {
  const pageSize = 14;
  const today = new Date();
  
  // Calculate date range for this page
  const startOffset = offset * pageSize;
  const dates: string[] = [];
  
  for (let i = startOffset; i < startOffset + pageSize; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    dates.push(`${day}.${month}.${year}`);
  }
  
  // Get schedules for these dates
  const schedules = await getSchedulesForDates(dates);
  
  // Check if there are older schedules (for hasMore)
  const oldestDate = dates[dates.length - 1];
  const olderSchedules = await prisma.schedule.findFirst({
    where: {
      date: { lt: oldestDate },
    },
  });
  
  // Calculate total pages based on all schedules
  const totalScheduleCount = await prisma.schedule.count();
  const totalPages = Math.ceil(totalScheduleCount / pageSize);
  
  return {
    schedules,
    hasMore: !!olderSchedules,
    totalPages,
  };
}
