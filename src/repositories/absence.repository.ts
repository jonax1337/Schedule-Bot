import { prisma } from './database.repository.js';

export interface AbsenceData {
  id: number;
  userId: string;
  startDate: string; // DD.MM.YYYY
  endDate: string;   // DD.MM.YYYY
  reason: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Parse DD.MM.YYYY to a Date object for comparison
 */
function parseGermanDate(dateStr: string): Date {
  const [day, month, year] = dateStr.split('.');
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
}

/**
 * Check if a date (DD.MM.YYYY) falls within a range [start, end] inclusive
 */
function isDateInRange(date: string, startDate: string, endDate: string): boolean {
  const d = parseGermanDate(date);
  const start = parseGermanDate(startDate);
  const end = parseGermanDate(endDate);
  return d >= start && d <= end;
}

/**
 * Get all absences for a user
 */
export async function getAbsencesForUser(userId: string): Promise<AbsenceData[]> {
  const absences = await prisma.absence.findMany({
    where: { userId },
    orderBy: { startDate: 'asc' },
  });

  return absences.map(a => ({
    id: a.id,
    userId: a.userId,
    startDate: a.startDate,
    endDate: a.endDate,
    reason: a.reason,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  }));
}

/**
 * Get all absences (for admin overview)
 */
export async function getAllAbsences(): Promise<AbsenceData[]> {
  const absences = await prisma.absence.findMany({
    orderBy: [{ startDate: 'asc' }],
  });

  return absences.map(a => ({
    id: a.id,
    userId: a.userId,
    startDate: a.startDate,
    endDate: a.endDate,
    reason: a.reason,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  }));
}

/**
 * Create a new absence entry
 */
export async function createAbsence(
  userId: string,
  startDate: string,
  endDate: string,
  reason: string = ''
): Promise<AbsenceData> {
  const absence = await prisma.absence.create({
    data: {
      userId,
      startDate,
      endDate,
      reason,
    },
  });

  return {
    id: absence.id,
    userId: absence.userId,
    startDate: absence.startDate,
    endDate: absence.endDate,
    reason: absence.reason,
    createdAt: absence.createdAt.toISOString(),
    updatedAt: absence.updatedAt.toISOString(),
  };
}

/**
 * Update an existing absence
 */
export async function updateAbsence(
  id: number,
  data: { startDate?: string; endDate?: string; reason?: string }
): Promise<AbsenceData | null> {
  try {
    const absence = await prisma.absence.update({
      where: { id },
      data,
    });

    return {
      id: absence.id,
      userId: absence.userId,
      startDate: absence.startDate,
      endDate: absence.endDate,
      reason: absence.reason,
      createdAt: absence.createdAt.toISOString(),
      updatedAt: absence.updatedAt.toISOString(),
    };
  } catch {
    return null;
  }
}

/**
 * Delete an absence by ID
 */
export async function deleteAbsence(id: number): Promise<boolean> {
  try {
    await prisma.absence.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get an absence by ID
 */
export async function getAbsenceById(id: number): Promise<AbsenceData | null> {
  const absence = await prisma.absence.findUnique({ where: { id } });
  if (!absence) return null;

  return {
    id: absence.id,
    userId: absence.userId,
    startDate: absence.startDate,
    endDate: absence.endDate,
    reason: absence.reason,
    createdAt: absence.createdAt.toISOString(),
    updatedAt: absence.updatedAt.toISOString(),
  };
}

/**
 * Check if a user is absent on a specific date
 */
export async function isUserAbsentOnDate(userId: string, date: string): Promise<boolean> {
  const absences = await prisma.absence.findMany({
    where: { userId },
  });

  return absences.some(a => isDateInRange(date, a.startDate, a.endDate));
}

/**
 * Get all absent user IDs for a specific date
 */
export async function getAbsentUserIdsForDate(date: string): Promise<string[]> {
  const allAbsences = await prisma.absence.findMany();

  const absentUserIds: string[] = [];
  for (const absence of allAbsences) {
    if (isDateInRange(date, absence.startDate, absence.endDate)) {
      if (!absentUserIds.includes(absence.userId)) {
        absentUserIds.push(absence.userId);
      }
    }
  }

  return absentUserIds;
}

/**
 * Get absent user IDs for multiple dates (batch operation)
 * Returns a map of date -> array of absent user IDs
 */
export async function getAbsentUserIdsForDates(dates: string[]): Promise<Record<string, string[]>> {
  const allAbsences = await prisma.absence.findMany();

  const result: Record<string, string[]> = {};
  for (const date of dates) {
    const absentUserIds: string[] = [];
    for (const absence of allAbsences) {
      if (isDateInRange(date, absence.startDate, absence.endDate)) {
        if (!absentUserIds.includes(absence.userId)) {
          absentUserIds.push(absence.userId);
        }
      }
    }
    result[date] = absentUserIds;
  }

  return result;
}
