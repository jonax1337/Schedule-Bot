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
  const absences = await prisma.absence.findMany({
    select: { userId: true, startDate: true, endDate: true },
  });

  const absentUserIds = new Set<string>();
  for (const absence of absences) {
    if (isDateInRange(date, absence.startDate, absence.endDate)) {
      absentUserIds.add(absence.userId);
    }
  }

  return [...absentUserIds];
}

/**
 * Get absent user IDs for multiple dates (batch operation)
 * Returns a map of date -> array of absent user IDs
 * Pre-parses absence dates once for efficiency across multiple date checks.
 */
export async function getAbsentUserIdsForDates(dates: string[]): Promise<Record<string, string[]>> {
  const absences = await prisma.absence.findMany({
    select: { userId: true, startDate: true, endDate: true },
  });

  // Pre-parse absence dates once instead of re-parsing per date
  const parsedAbsences = absences.map(a => ({
    userId: a.userId,
    start: parseGermanDate(a.startDate),
    end: parseGermanDate(a.endDate),
  }));

  const result: Record<string, string[]> = {};
  for (const date of dates) {
    const d = parseGermanDate(date);
    const userIds = new Set<string>();
    for (const absence of parsedAbsences) {
      if (d >= absence.start && d <= absence.end) {
        userIds.add(absence.userId);
      }
    }
    result[date] = [...userIds];
  }

  return result;
}
