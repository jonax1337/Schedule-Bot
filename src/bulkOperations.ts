import { updatePlayerAvailability } from './database/scheduleOperations.js';

export interface WeekAvailability {
  [date: string]: string; // date -> time range or 'x'
}

export async function updateWeekAvailability(
  playerColumn: string,
  weekData: WeekAvailability
): Promise<{ success: boolean; updated: number; failed: string[] }> {
  const results = {
    success: true,
    updated: 0,
    failed: [] as string[],
  };

  for (const [date, availability] of Object.entries(weekData)) {
    try {
      const success = await updatePlayerAvailability(date, playerColumn, availability);
      if (success) {
        results.updated++;
      } else {
        results.failed.push(date);
        results.success = false;
      }
    } catch (error) {
      console.error(`Error updating ${date}:`, error);
      results.failed.push(date);
      results.success = false;
    }
  }

  return results;
}

export function getNextSevenDates(): string[] {
  const dates: string[] = [];
  const today = new Date();

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    dates.push(`${day}.${month}.${year}`);
  }

  return dates;
}

export function getDayName(dateStr: string): string {
  const [day, month, year] = dateStr.split('.').map(Number);
  const date = new Date(year, month - 1, day);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()];
}
