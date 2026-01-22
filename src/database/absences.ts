import { prisma } from './client.js';

export interface Absence {
  id: string;
  discordId: string;
  username: string;
  startDate: string;
  endDate: string;
  reason: string;
  createdAt: string;
}

let absencesCache: Absence[] | null = null;
let absencesCacheTimestamp = 0;
const ABSENCES_CACHE_DURATION = 2 * 60 * 1000;

function generateId(): string {
  return `abs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export async function ensureAbsencesSheetExists(): Promise<void> {
  console.log('[Absences] Table verified (PostgreSQL)');
}

export async function getAllAbsences(forceRefresh = false): Promise<Absence[]> {
  const now = Date.now();
  if (!forceRefresh && absencesCache && (now - absencesCacheTimestamp) < ABSENCES_CACHE_DURATION) {
    return absencesCache;
  }

  const absences = await prisma.absence.findMany({
    orderBy: { createdAt: 'desc' },
  });

  const result = absences.map(a => ({
    id: a.id,
    discordId: a.userId,
    username: a.username,
    startDate: a.startDate,
    endDate: a.endDate,
    reason: a.reason || '',
    createdAt: a.createdAt.toISOString(),
  }));

  absencesCache = result;
  absencesCacheTimestamp = now;

  return result;
}

export async function getAbsencesByUser(discordId: string): Promise<Absence[]> {
  const absences = await prisma.absence.findMany({
    where: { userId: discordId },
    orderBy: { createdAt: 'desc' },
  });

  return absences.map(a => ({
    id: a.id,
    discordId: a.userId,
    username: a.username,
    startDate: a.startDate,
    endDate: a.endDate,
    reason: a.reason || '',
    createdAt: a.createdAt.toISOString(),
  }));
}

export async function getAbsenceById(id: string): Promise<Absence | null> {
  const absence = await prisma.absence.findUnique({
    where: { id },
  });

  if (!absence) return null;

  return {
    id: absence.id,
    discordId: absence.userId,
    username: absence.username,
    startDate: absence.startDate,
    endDate: absence.endDate,
    reason: absence.reason || '',
    createdAt: absence.createdAt.toISOString(),
  };
}

export async function addAbsence(absence: Omit<Absence, 'id' | 'createdAt'>): Promise<Absence> {
  const newAbsence = await prisma.absence.create({
    data: {
      id: generateId(),
      userId: absence.discordId,
      username: absence.username,
      startDate: absence.startDate,
      endDate: absence.endDate,
      reason: absence.reason || null,
    },
  });

  absencesCache = null;

  console.log(`Absence added: ${newAbsence.username} from ${newAbsence.startDate} to ${newAbsence.endDate}`);

  return {
    id: newAbsence.id,
    discordId: newAbsence.userId,
    username: newAbsence.username,
    startDate: newAbsence.startDate,
    endDate: newAbsence.endDate,
    reason: newAbsence.reason || '',
    createdAt: newAbsence.createdAt.toISOString(),
  };
}

export async function updateAbsence(id: string, updates: Partial<Omit<Absence, 'id' | 'discordId' | 'createdAt'>>): Promise<Absence | null> {
  try {
    const updateData: any = {};
    if (updates.username !== undefined) updateData.username = updates.username;
    if (updates.startDate !== undefined) updateData.startDate = updates.startDate;
    if (updates.endDate !== undefined) updateData.endDate = updates.endDate;
    if (updates.reason !== undefined) updateData.reason = updates.reason || null;

    const updatedAbsence = await prisma.absence.update({
      where: { id },
      data: updateData,
    });

    absencesCache = null;

    console.log(`Absence updated: ${id}`);

    return {
      id: updatedAbsence.id,
      discordId: updatedAbsence.userId,
      username: updatedAbsence.username,
      startDate: updatedAbsence.startDate,
      endDate: updatedAbsence.endDate,
      reason: updatedAbsence.reason || '',
      createdAt: updatedAbsence.createdAt.toISOString(),
    };
  } catch (error) {
    return null;
  }
}

export async function deleteAbsence(id: string): Promise<boolean> {
  try {
    await prisma.absence.delete({
      where: { id },
    });

    absencesCache = null;

    console.log(`Absence deleted: ${id}`);
    return true;
  } catch (error) {
    return false;
  }
}

function parseDateString(dateStr: string): Date | null {
  const match = dateStr.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!match) return null;

  const [, day, month, year] = match;
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
}

export function isDateInAbsence(date: string, absence: Absence): boolean {
  const checkDate = parseDateString(date);
  const startDate = parseDateString(absence.startDate);
  const endDate = parseDateString(absence.endDate);

  if (!checkDate || !startDate || !endDate) {
    return false;
  }

  return checkDate >= startDate && checkDate <= endDate;
}

export async function getActiveAbsencesForDate(date: string): Promise<Absence[]> {
  const allAbsences = await getAllAbsences();
  return allAbsences.filter(absence => isDateInAbsence(date, absence));
}

export async function getUsersAbsentOnDate(date: string): Promise<string[]> {
  const activeAbsences = await getActiveAbsencesForDate(date);
  return activeAbsences.map(a => a.discordId);
}
