import { formatDateToDDMMYYYY, parseDDMMYYYY, addDays } from '../../shared/utils/dateFormatter.js';
import { getScheduleForDate } from '../../repositories/schedule.repository.js';
import { getAbsentUserIdsForDate } from '../../repositories/absence.repository.js';

export const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
export const WEEKDAY_LABELS_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getMondayOf(date: Date): Date {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export function getCurrentWeekMonday(): string {
  return formatDateToDDMMYYYY(getMondayOf(new Date()));
}

export function getNextWeekMonday(): string {
  const monday = getMondayOf(new Date());
  monday.setDate(monday.getDate() + 7);
  return formatDateToDDMMYYYY(monday);
}

export function getWeekDates(weekMonday: string): string[] {
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    dates.push(addDays(weekMonday, i));
  }
  return dates;
}

export function isSameWeek(dateA: string, dateB: string): boolean {
  const mondayA = formatDateToDDMMYYYY(getMondayOf(parseDDMMYYYY(dateA)));
  const mondayB = formatDateToDDMMYYYY(getMondayOf(parseDDMMYYYY(dateB)));
  return mondayA === mondayB;
}

export interface MissingDayInfo {
  date: string;
  weekdayLabel: string;
}

export async function getMissingDaysForUser(userId: string, weekMonday: string): Promise<MissingDayInfo[]> {
  const dates = getWeekDates(weekMonday);
  const missing: MissingDayInfo[] = [];

  for (let i = 0; i < dates.length; i++) {
    const date = dates[i];
    const absentIds = await getAbsentUserIdsForDate(date);
    if (absentIds.includes(userId)) continue;

    const schedule = await getScheduleForDate(date);
    if (!schedule) {
      missing.push({ date, weekdayLabel: WEEKDAY_LABELS_LONG[i] });
      continue;
    }

    const player = schedule.players.find(p => p.userId === userId);
    const availability = player?.availability?.trim() || '';
    if (!availability) {
      missing.push({ date, weekdayLabel: WEEKDAY_LABELS_LONG[i] });
    }
  }

  return missing;
}
