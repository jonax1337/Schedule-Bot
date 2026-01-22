/**
 * PostgreSQL-basierte Schedule-Operationen
 * Ersetzt sheetUpdater.ts Funktionen
 */

import { prisma } from './client.js';
import { getScheduleForDate } from './schedules.js';

export async function updatePlayerAvailability(
  date: string,
  columnName: string,
  value: string
): Promise<boolean> {
  const schedule = await prisma.schedule.findUnique({
    where: { date },
  });

  if (!schedule) {
    throw new Error(`No schedule found for date: ${date}`);
  }

  // Map column name to database field
  const fieldMap: { [key: string]: keyof typeof schedule } = {
    'Player 1': 'player1',
    'Player 2': 'player2',
    'Player 3': 'player3',
    'Player 4': 'player4',
    'Player 5': 'player5',
    'Sub 1': 'sub1',
    'Sub 2': 'sub2',
    'Coach': 'coach',
  };

  const field = fieldMap[columnName];
  if (!field) {
    throw new Error(`Unknown column: ${columnName}`);
  }

  await prisma.schedule.update({
    where: { date },
    data: { [field]: value },
  });

  console.log(`Updated ${columnName} for ${date}: ${value}`);
  return true;
}

export async function getPlayerAvailabilityForRange(
  columnName: string,
  startDate: string,
  endDate: string
): Promise<{ [date: string]: string }> {
  const schedules = await prisma.schedule.findMany({
    where: {
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { date: 'asc' },
  });

  const fieldMap: { [key: string]: keyof typeof schedules[0] } = {
    'Player 1': 'player1',
    'Player 2': 'player2',
    'Player 3': 'player3',
    'Player 4': 'player4',
    'Player 5': 'player5',
    'Sub 1': 'sub1',
    'Sub 2': 'sub2',
    'Coach': 'coach',
  };

  const field = fieldMap[columnName];
  if (!field) {
    return {};
  }

  const result: { [date: string]: string } = {};
  for (const schedule of schedules) {
    result[schedule.date] = String(schedule[field] || '');
  }

  return result;
}

export async function getAvailableDates(): Promise<string[]> {
  const schedules = await prisma.schedule.findMany({
    orderBy: { date: 'asc' },
    select: { date: true },
  });

  return schedules.map(s => s.date);
}

export async function bulkUpdatePlayerAvailability(
  updates: Array<{ date: string; columnName: string; value: string }>
): Promise<void> {
  for (const update of updates) {
    await updatePlayerAvailability(update.date, update.columnName, update.value);
  }
}
