/**
 * Centralized regex patterns used across the application
 * Single source of truth for validation patterns
 */

export const PATTERNS = {
  /** Discord snowflake ID (17-19 digits) */
  DISCORD_ID: /^\d{17,19}$/,

  /** Date in DD.MM.YYYY format */
  DATE_DDMMYYYY: /^\d{2}\.\d{2}\.\d{4}$/,

  /** Date in DD.MM.YYYY format (lenient - allows single digits) */
  DATE_DDMMYYYY_LENIENT: /^\d{1,2}\.\d{1,2}\.\d{4}$/,

  /** Time in HH:MM format */
  TIME_HHMM: /^\d{2}:\d{2}$/,

  /** Time range in HH:MM-HH:MM format */
  TIME_RANGE: /^\d{2}:\d{2}-\d{2}:\d{2}$/,

  /** Availability value: time range or 'x'/'X' for unavailable */
  AVAILABILITY: /^(\d{2}:\d{2}-\d{2}:\d{2}|x|X)$/,

  /** URL with http or https scheme */
  URL_HTTP: /^https?:\/\/.+/i,
} as const;

/**
 * Validation helper functions using the centralized patterns
 */
export const validators = {
  isDiscordId: (value: string): boolean => PATTERNS.DISCORD_ID.test(value),
  isDateDDMMYYYY: (value: string): boolean => PATTERNS.DATE_DDMMYYYY.test(value),
  isTimeHHMM: (value: string): boolean => PATTERNS.TIME_HHMM.test(value),
  isTimeRange: (value: string): boolean => PATTERNS.TIME_RANGE.test(value),
  isAvailability: (value: string): boolean => PATTERNS.AVAILABILITY.test(value),
  isHttpUrl: (value: string): boolean => PATTERNS.URL_HTTP.test(value),
} as const;
