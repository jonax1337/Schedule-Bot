/**
 * Centralized date formatting utilities
 * All dates in the bot MUST use DD.MM.YYYY format
 */

/**
 * Format a Date object to DD.MM.YYYY
 */
export function formatDateToDDMMYYYY(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

/**
 * Get today's date in DD.MM.YYYY format
 */
export function getTodayFormatted(): string {
  return formatDateToDDMMYYYY(new Date());
}

/**
 * Parse DD.MM.YYYY string to Date object
 */
export function parseDDMMYYYY(dateStr: string): Date {
  const [day, month, year] = dateStr.split('.').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Add days to a DD.MM.YYYY date string
 */
export function addDays(dateStr: string, days: number): string {
  const date = parseDDMMYYYY(dateStr);
  date.setDate(date.getDate() + days);
  return formatDateToDDMMYYYY(date);
}

/**
 * Get next N dates from today in DD.MM.YYYY format
 */
export function getNextNDates(n: number): string[] {
  const dates: string[] = [];
  const today = new Date();
  
  for (let i = 0; i < n; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    dates.push(formatDateToDDMMYYYY(date));
  }
  
  return dates;
}

/**
 * Normalize date format to DD.MM.YYYY with leading zeros
 */
export function normalizeDateFormat(dateStr: string): string {
  const match = dateStr.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!match) return dateStr;

  const [, day, month, year] = match;
  return `${day.padStart(2, '0')}.${month.padStart(2, '0')}.${year}`;
}

/**
 * Check if date1 is after or equal to date2
 */
export function isDateAfterOrEqual(dateStr1: string, dateStr2: string): boolean {
  const date1 = parseDDMMYYYY(dateStr1);
  const date2 = parseDDMMYYYY(dateStr2);
  return date1 >= date2;
}

/**
 * Convert HH:MM time string to total minutes since midnight
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Convert total minutes since midnight to HH:MM string
 */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}
