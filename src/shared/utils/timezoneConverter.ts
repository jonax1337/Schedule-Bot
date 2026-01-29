/**
 * Timezone conversion utilities for converting times between IANA timezones.
 * Used by Discord bot interactions to convert user input to bot timezone before saving.
 */

/**
 * Convert a time string (HH:MM) from one IANA timezone to another on a given date.
 * Uses Intl.DateTimeFormat for accurate DST-aware conversion.
 *
 * Algorithm:
 * 1. Create a reference Date object with the desired hours/minutes
 * 2. Format it in the source timezone to see what time the system thinks it is there
 * 3. Calculate the difference between desired and actual, adjust the Date
 * 4. Now the adjusted Date, when formatted in source TZ, shows our desired time
 * 5. Format the adjusted Date in the target timezone to get the converted time
 *
 * @param time - Time in "HH:MM" format
 * @param date - Date in "DD.MM.YYYY" format (needed for DST accuracy)
 * @param fromTz - Source IANA timezone (e.g., "America/New_York")
 * @param toTz - Target IANA timezone (e.g., "Europe/Berlin")
 * @returns Converted time in "HH:MM" format
 */
export function convertTimeBetweenTimezones(
  time: string,
  date: string,
  fromTz: string,
  toTz: string
): string {
  if (fromTz === toTz) return time;

  const [day, month, year] = date.split('.').map(Number);
  const [hours, minutes] = time.split(':').map(Number);

  // Create a reference Date using the actual date for correct DST
  const refDate = new Date(year, month - 1, day, hours, minutes, 0);

  // Format in source timezone to see what time this Date represents there
  const sourceFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: fromTz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const sourceParts = sourceFormatter.formatToParts(refDate);
  const sourceHour = Number(sourceParts.find(p => p.type === 'hour')?.value ?? 0);
  const sourceMinute = Number(sourceParts.find(p => p.type === 'minute')?.value ?? 0);

  // Calculate difference between what we want and what we got
  const wantedMinutes = hours * 60 + minutes;
  const gotMinutes = sourceHour * 60 + sourceMinute;
  const diffMinutes = wantedMinutes - gotMinutes;

  // Adjust so that when formatted in fromTz, it shows our desired time
  const adjusted = new Date(refDate.getTime() + diffMinutes * 60 * 1000);

  // Format in target timezone
  const targetFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: toTz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const result = targetFormatter.format(adjusted);
  return result === '24:00' ? '00:00' : result;
}

/**
 * Convert a time range string (HH:MM-HH:MM) between timezones.
 */
export function convertTimeRangeBetweenTimezones(
  range: string,
  date: string,
  fromTz: string,
  toTz: string
): string {
  if (fromTz === toTz) return range;

  const parts = range.split('-').map(s => s.trim());
  if (parts.length !== 2) return range;

  const start = convertTimeBetweenTimezones(parts[0], date, fromTz, toTz);
  const end = convertTimeBetweenTimezones(parts[1], date, fromTz, toTz);

  return `${start}-${end}`;
}

/**
 * Validate if a string is a valid IANA timezone.
 */
export function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get a short timezone abbreviation (e.g., "CET", "EST", "PST").
 */
export function getTimezoneAbbreviation(tz: string): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'short',
    });
    const parts = formatter.formatToParts(new Date());
    const tzPart = parts.find(p => p.type === 'timeZoneName');
    return tzPart?.value || tz;
  } catch {
    return tz;
  }
}

/**
 * Get all supported IANA timezone names.
 */
export function getSupportedTimezones(): string[] {
  try {
    return Intl.supportedValuesOf('timeZone');
  } catch {
    // Fallback for older Node.js
    return ['UTC', 'Europe/Berlin', 'America/New_York', 'America/Los_Angeles', 'Asia/Tokyo'];
  }
}
