import { prisma } from './client.js';
import type { SheetData, PlayerNames } from '../types.js';

function formatDateForComparison(dateStr: string): string {
  const cleanDate = dateStr.trim();

  const dotMatch = cleanDate.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (dotMatch) {
    const [, day, month, year] = dotMatch;
    return `${day.padStart(2, '0')}.${month.padStart(2, '0')}.${year}`;
  }

  const isoMatch = cleanDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${day}.${month}.${year}`;
  }

  const slashMatch = cleanDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, day, month, year] = slashMatch;
    return `${day.padStart(2, '0')}.${month.padStart(2, '0')}.${year}`;
  }

  return cleanDate;
}

function getTodayFormatted(): string {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  return `${day}.${month}.${year}`;
}

export async function getScheduleForDate(targetDate?: string): Promise<SheetData | null> {
  const dateToFind = targetDate ? formatDateForComparison(targetDate) : getTodayFormatted();

  const schedule = await prisma.schedule.findUnique({
    where: { date: dateToFind },
  });

  if (!schedule) {
    console.log(`No schedule found for date: ${dateToFind}`);
    return null;
  }

  const names: PlayerNames = {
    player1: 'Player 1',
    player2: 'Player 2',
    player3: 'Player 3',
    player4: 'Player 4',
    player5: 'Player 5',
    sub1: 'Sub 1',
    sub2: 'Sub 2',
    coach: 'Coach',
  };

  return {
    date: schedule.date,
    players: {
      player1: schedule.player1,
      player2: schedule.player2,
      player3: schedule.player3,
      player4: schedule.player4,
      player5: schedule.player5,
      sub1: schedule.sub1,
      sub2: schedule.sub2,
      coach: schedule.coach,
    },
    names,
    reason: schedule.reason,
    focus: schedule.focus,
  };
}

export async function testConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Failed to connect to database:', error);
    return false;
  }
}

export async function getSheetColumns(): Promise<Array<{ column: string; name: string; index: number }>> {
  const columns = [
    { column: 'B', name: 'Player 1', index: 1 },
    { column: 'C', name: 'Player 2', index: 2 },
    { column: 'D', name: 'Player 3', index: 3 },
    { column: 'E', name: 'Player 4', index: 4 },
    { column: 'F', name: 'Player 5', index: 5 },
    { column: 'G', name: 'Sub 1', index: 6 },
    { column: 'H', name: 'Sub 2', index: 7 },
    { column: 'I', name: 'Coach', index: 8 },
  ];

  return columns;
}

export async function getSheetDataRange(startRow: number = 1, endRow: number = 50): Promise<any[][]> {
  const schedules = await prisma.schedule.findMany({
    orderBy: { date: 'asc' },
    take: endRow - startRow + 1,
    skip: startRow - 1,
  });

  const rows: any[][] = [
    ['Date', 'Player 1', 'Player 2', 'Player 3', 'Player 4', 'Player 5', 'Sub 1', 'Sub 2', 'Coach', 'Reason', 'Focus']
  ];

  for (const schedule of schedules) {
    rows.push([
      schedule.date,
      schedule.player1,
      schedule.player2,
      schedule.player3,
      schedule.player4,
      schedule.player5,
      schedule.sub1,
      schedule.sub2,
      schedule.coach,
      schedule.reason,
      schedule.focus,
    ]);
  }

  return rows;
}

const columnMapping: { [key: string]: string } = {
  'A': 'date',
  'B': 'player1',
  'C': 'player2',
  'D': 'player3',
  'E': 'player4',
  'F': 'player5',
  'G': 'sub1',
  'H': 'sub2',
  'I': 'coach',
  'J': 'reason',
  'K': 'focus',
};

export async function updateSheetCell(row: number, column: string, value: string): Promise<void> {
  const schedules = await prisma.schedule.findMany({
    orderBy: { date: 'asc' },
  });

  const scheduleIndex = row - 2;
  if (scheduleIndex < 0 || scheduleIndex >= schedules.length) {
    throw new Error(`Invalid row number: ${row}`);
  }

  const schedule = schedules[scheduleIndex];
  const fieldName = columnMapping[column];

  if (!fieldName) {
    throw new Error(`Invalid column: ${column}`);
  }

  await prisma.schedule.update({
    where: { id: schedule.id },
    data: { [fieldName]: value },
  });
}

export async function bulkUpdateSheetCells(updates: Array<{ row: number; column: string; value: string }>): Promise<void> {
  if (updates.length === 0) return;

  const schedules = await prisma.schedule.findMany({
    orderBy: { date: 'asc' },
  });

  const updatePromises = updates.map(async (update) => {
    const scheduleIndex = update.row - 2;
    if (scheduleIndex < 0 || scheduleIndex >= schedules.length) {
      console.warn(`Skipping invalid row number: ${update.row}`);
      return;
    }

    const schedule = schedules[scheduleIndex];
    const fieldName = columnMapping[update.column];

    if (!fieldName) {
      console.warn(`Skipping invalid column: ${update.column}`);
      return;
    }

    return prisma.schedule.update({
      where: { id: schedule.id },
      data: { [fieldName]: update.value },
    });
  });

  await Promise.all(updatePromises);
  console.log(`[Bulk Update] Updated ${updates.length} cells in a single batch`);
}

export async function cleanupTimeFormats(): Promise<number> {
  const schedules = await prisma.schedule.findMany();
  let updateCount = 0;

  for (const schedule of schedules) {
    const updates: any = {};
    let hasUpdates = false;

    const fields = ['player1', 'player2', 'player3', 'player4', 'player5', 'sub1', 'sub2', 'coach'];
    
    for (const field of fields) {
      const value = (schedule as any)[field];
      if (value && typeof value === 'string' && value.trim() !== '' && value !== 'x') {
        const cleanedValue = value.replace(/\s*-\s*/g, '-');
        if (cleanedValue !== value) {
          updates[field] = cleanedValue;
          hasUpdates = true;
          updateCount++;
        }
      }
    }

    if (hasUpdates) {
      await prisma.schedule.update({
        where: { id: schedule.id },
        data: updates,
      });
    }
  }

  if (updateCount > 0) {
    console.log(`Successfully cleaned up ${updateCount} time format(s).`);
  }

  return updateCount;
}

function parseDateString(dateStr: string): Date | null {
  const formatted = formatDateForComparison(dateStr);
  const match = formatted.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!match) return null;

  const [, day, month, year] = match;
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
}

function formatDateToString(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

export async function deleteOldRows(): Promise<number> {
  await cleanupTimeFormats();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const maxFutureDate = new Date(today);
  maxFutureDate.setDate(maxFutureDate.getDate() + 13);

  const schedules = await prisma.schedule.findMany();
  const idsToDelete: number[] = [];

  for (const schedule of schedules) {
    const rowDate = parseDateString(schedule.date);
    if (rowDate && (rowDate < today || rowDate > maxFutureDate)) {
      idsToDelete.push(schedule.id);
    }
  }

  if (idsToDelete.length > 0) {
    await prisma.schedule.deleteMany({
      where: { id: { in: idsToDelete } },
    });
    console.log(`Successfully deleted ${idsToDelete.length} row(s) outside the 14-day window.`);
  }

  await addMissingDays();

  return idsToDelete.length;
}

async function addMissingDays(): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existingSchedules = await prisma.schedule.findMany({
    select: { date: true },
  });

  const existingDates = new Set(existingSchedules.map(s => s.date));
  const missingDates: string[] = [];

  for (let i = 0; i < 14; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() + i);
    const dateStr = formatDateToString(checkDate);
    
    if (!existingDates.has(dateStr)) {
      missingDates.push(dateStr);
    }
  }

  if (missingDates.length === 0) {
    return 0;
  }

  console.log(`Adding ${missingDates.length} missing date(s): ${missingDates.join(', ')}`);

  await prisma.schedule.createMany({
    data: missingDates.map(date => ({
      date,
      player1: '',
      player2: '',
      player3: '',
      player4: '',
      player5: '',
      sub1: '',
      sub2: '',
      coach: '',
      reason: '',
      focus: '',
    })),
  });

  console.log(`Successfully added ${missingDates.length} missing date(s).`);
  return missingDates.length;
}

export interface SheetSettings {
  discord: {
    channelId: string;
    pingRoleId: string | null;
    allowDiscordAuth: boolean;
  };
  scheduling: {
    dailyPostTime: string;
    reminderHoursBefore: number;
    trainingStartPollEnabled: boolean;
    timezone: string;
    cleanChannelBeforePost: boolean;
    changeNotificationsEnabled?: boolean;
  };
}

export async function getSettingsFromSheet(): Promise<SheetSettings | null> {
  try {
    const settings = await prisma.setting.findMany();
    
    if (settings.length === 0) {
      return null;
    }

    const settingsMap = new Map(settings.map(s => [s.key, s.value]));

    return {
      discord: {
        channelId: settingsMap.get('discord.channelId') || '',
        pingRoleId: settingsMap.get('discord.pingRoleId') || null,
        allowDiscordAuth: settingsMap.get('discord.allowDiscordAuth') === 'true',
      },
      scheduling: {
        dailyPostTime: settingsMap.get('scheduling.dailyPostTime') || '12:00',
        reminderHoursBefore: parseInt(settingsMap.get('scheduling.reminderHoursBefore') || '3'),
        trainingStartPollEnabled: settingsMap.get('scheduling.trainingStartPollEnabled') === 'true',
        timezone: settingsMap.get('scheduling.timezone') || 'Europe/Berlin',
        cleanChannelBeforePost: settingsMap.get('scheduling.cleanChannelBeforePost') === 'true',
        changeNotificationsEnabled: settingsMap.get('scheduling.changeNotificationsEnabled') === 'true',
      },
    };
  } catch (error) {
    console.error('Error reading settings from database:', error);
    return null;
  }
}

export async function saveSettingsToSheet(settings: SheetSettings): Promise<void> {
  const settingsData = [
    { key: 'discord.channelId', value: settings.discord.channelId },
    { key: 'discord.pingRoleId', value: settings.discord.pingRoleId || '' },
    { key: 'discord.allowDiscordAuth', value: settings.discord.allowDiscordAuth.toString() },
    { key: 'scheduling.dailyPostTime', value: settings.scheduling.dailyPostTime },
    { key: 'scheduling.reminderHoursBefore', value: settings.scheduling.reminderHoursBefore.toString() },
    { key: 'scheduling.trainingStartPollEnabled', value: settings.scheduling.trainingStartPollEnabled.toString() },
    { key: 'scheduling.timezone', value: settings.scheduling.timezone },
    { key: 'scheduling.cleanChannelBeforePost', value: settings.scheduling.cleanChannelBeforePost.toString() },
  ];

  for (const setting of settingsData) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    });
  }

  console.log('Settings saved to database successfully');
}

export async function getNext14Dates(): Promise<string[]> {
  const schedules = await prisma.schedule.findMany({
    orderBy: { date: 'asc' },
    take: 14,
    select: { date: true },
  });
  
  return schedules.map(s => s.date);
}
