import { describe, it, expect } from 'vitest';
import {
  convertTimeBetweenTimezones,
  convertTimeRangeBetweenTimezones,
  isValidTimezone,
  getTimezoneAbbreviation,
  getSupportedTimezones,
} from '../timezoneConverter.js';

describe('convertTimeBetweenTimezones', () => {
  it('returns same time when timezones are identical', () => {
    expect(convertTimeBetweenTimezones('14:00', '15.01.2026', 'Europe/Berlin', 'Europe/Berlin')).toBe('14:00');
  });

  it('converts Berlin to UTC (CET = UTC+1 in winter)', () => {
    // January is CET (UTC+1), so 14:00 Berlin = 13:00 UTC
    const result = convertTimeBetweenTimezones('14:00', '15.01.2026', 'Europe/Berlin', 'UTC');
    expect(result).toBe('13:00');
  });

  it('converts UTC to New York (EST = UTC-5 in winter)', () => {
    const result = convertTimeBetweenTimezones('14:00', '15.01.2026', 'UTC', 'America/New_York');
    expect(result).toBe('09:00');
  });

  it('converts Berlin to New York (6 hour difference in winter)', () => {
    const result = convertTimeBetweenTimezones('18:00', '15.01.2026', 'Europe/Berlin', 'America/New_York');
    expect(result).toBe('12:00');
  });

  it('handles midnight edge', () => {
    const result = convertTimeBetweenTimezones('00:00', '15.01.2026', 'UTC', 'Europe/Berlin');
    expect(result).toBe('01:00');
  });
});

describe('convertTimeRangeBetweenTimezones', () => {
  it('returns same range when timezones are identical', () => {
    expect(convertTimeRangeBetweenTimezones('14:00-20:00', '15.01.2026', 'UTC', 'UTC')).toBe('14:00-20:00');
  });

  it('converts a range from Berlin to UTC', () => {
    const result = convertTimeRangeBetweenTimezones('14:00-20:00', '15.01.2026', 'Europe/Berlin', 'UTC');
    expect(result).toBe('13:00-19:00');
  });

  it('returns invalid range unchanged', () => {
    expect(convertTimeRangeBetweenTimezones('invalid', '15.01.2026', 'UTC', 'Europe/Berlin')).toBe('invalid');
  });
});

describe('isValidTimezone', () => {
  it('accepts valid IANA timezone', () => {
    expect(isValidTimezone('Europe/Berlin')).toBe(true);
    expect(isValidTimezone('America/New_York')).toBe(true);
    expect(isValidTimezone('UTC')).toBe(true);
  });

  it('rejects invalid timezone', () => {
    expect(isValidTimezone('Not/A/Timezone')).toBe(false);
    expect(isValidTimezone('')).toBe(false);
  });
});

describe('getTimezoneAbbreviation', () => {
  it('returns abbreviation for valid timezone', () => {
    const abbr = getTimezoneAbbreviation('UTC');
    expect(abbr).toBe('UTC');
  });

  it('returns fallback string for invalid timezone', () => {
    const abbr = getTimezoneAbbreviation('Invalid/TZ');
    expect(abbr).toBe('Invalid/TZ');
  });
});

describe('getSupportedTimezones', () => {
  it('returns an array of timezone strings', () => {
    const tzs = getSupportedTimezones();
    expect(Array.isArray(tzs)).toBe(true);
    expect(tzs.length).toBeGreaterThan(0);
  });

  it('includes common timezones', () => {
    const tzs = getSupportedTimezones();
    expect(tzs).toContain('Europe/Berlin');
    expect(tzs).toContain('America/New_York');
    // UTC may not be in Intl.supportedValuesOf('timeZone') on all runtimes
    expect(tzs.length).toBeGreaterThan(100);
  });
});
