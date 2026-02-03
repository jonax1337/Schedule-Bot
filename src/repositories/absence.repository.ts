import { prisma } from './database.repository.js';
import { parseDDMMYYYY } from '../shared/utils/dateFormatter.js';
import { mapTimestamps } from '../shared/utils/mapper.js';

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
 * Map Prisma Absence entity to AbsenceData DTO
 */
function mapAbsence(absence: {
  id: number;
  userId: string;
  startDate: string;
  endDate: string;
  reason: string;
  createdAt: Date;
  updatedAt: Date;
}): AbsenceData {
  return mapTimestamps(absence);
}

/**
 * Check if a date (DD.MM.YYYY) falls within a range [start, end] inclusive
 */
function isDateInRange(date: string, startDate: string, endDate: string): boolean {
  const d = parseDDMMYYYY(date);
  const start = parseDDMMYYYY(startDate);
  const end = parseDDMMYYYY(endDate);
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

  return absences.map(mapAbsence);
}

/**
 * Get all absences (for admin overview)
 */
export async function getAllAbsences(): Promise<AbsenceData[]> {
  const absences = await prisma.absence.findMany({
    orderBy: [{ startDate: 'asc' }],
  });

  return absences.map(mapAbsence);
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

  return mapAbsence(absence);
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

    return mapAbsence(absence);
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

  return mapAbsence(absence);
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
    start: parseDDMMYYYY(a.startDate),
    end: parseDDMMYYYY(a.endDate),
  }));

  const result: Record<string, string[]> = {};
  for (const date of dates) {
    const d = parseDDMMYYYY(date);
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
