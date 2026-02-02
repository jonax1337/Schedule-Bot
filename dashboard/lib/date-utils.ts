/**
 * Parse DD.MM.YYYY string to Date object
 */
export function parseDDMMYYYY(dateStr: string): Date {
  const [day, month, year] = dateStr.split('.').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Get weekday name from DD.MM.YYYY string
 */
export function getWeekdayName(dateStr: string): string {
  const date = parseDDMMYYYY(dateStr);
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

/**
 * Get reason badge color classes
 */
export function getReasonBadgeClasses(reason: string): string {
  switch (reason) {
    case 'Premier': return 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300';
    case 'Off-Day': return 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300';
    case 'Scrims': return 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300';
    case 'Tournament': return 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300';
    case 'VOD-Review': return 'bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300';
    case 'Training': return 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300';
    default: return 'bg-muted text-muted-foreground';
  }
}

export const SCHEDULE_REASON_SUGGESTIONS = ['Training', 'Off-Day', 'VOD-Review', 'Scrims', 'Premier', 'Tournament'];
