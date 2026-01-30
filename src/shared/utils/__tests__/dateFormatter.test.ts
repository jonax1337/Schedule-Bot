import { describe, it, expect } from 'vitest';
import {
  formatDateToDDMMYYYY,
  parseDDMMYYYY,
  addDays,
  getNextNDates,
  normalizeDateFormat,
  isDateAfterOrEqual,
} from '../dateFormatter.js';

describe('formatDateToDDMMYYYY', () => {
  it('formats a date with leading zeros', () => {
    expect(formatDateToDDMMYYYY(new Date(2026, 0, 5))).toBe('05.01.2026');
  });

  it('formats a date without needing leading zeros', () => {
    expect(formatDateToDDMMYYYY(new Date(2026, 11, 25))).toBe('25.12.2026');
  });

  it('handles month boundary (January = 0)', () => {
    expect(formatDateToDDMMYYYY(new Date(2026, 0, 1))).toBe('01.01.2026');
  });

  it('handles December correctly', () => {
    expect(formatDateToDDMMYYYY(new Date(2026, 11, 31))).toBe('31.12.2026');
  });
});

describe('parseDDMMYYYY', () => {
  it('parses a valid DD.MM.YYYY string', () => {
    const date = parseDDMMYYYY('15.06.2026');
    expect(date.getDate()).toBe(15);
    expect(date.getMonth()).toBe(5); // June = 5
    expect(date.getFullYear()).toBe(2026);
  });

  it('roundtrips with formatDateToDDMMYYYY', () => {
    const original = '01.01.2026';
    expect(formatDateToDDMMYYYY(parseDDMMYYYY(original))).toBe(original);
  });
});

describe('addDays', () => {
  it('adds days within the same month', () => {
    expect(addDays('01.01.2026', 5)).toBe('06.01.2026');
  });

  it('crosses month boundary', () => {
    expect(addDays('30.01.2026', 2)).toBe('01.02.2026');
  });

  it('crosses year boundary', () => {
    expect(addDays('31.12.2025', 1)).toBe('01.01.2026');
  });

  it('handles leap year (Feb 29)', () => {
    expect(addDays('28.02.2024', 1)).toBe('29.02.2024');
  });

  it('handles non-leap year (Feb 28 → Mar 1)', () => {
    expect(addDays('28.02.2025', 1)).toBe('01.03.2025');
  });

  it('subtracts days with negative value', () => {
    expect(addDays('05.01.2026', -5)).toBe('31.12.2025');
  });
});

describe('getNextNDates', () => {
  it('returns correct number of dates', () => {
    expect(getNextNDates(7)).toHaveLength(7);
  });

  it('returns empty array for 0', () => {
    expect(getNextNDates(0)).toHaveLength(0);
  });

  it('first date is today', () => {
    const dates = getNextNDates(1);
    expect(dates[0]).toBe(formatDateToDDMMYYYY(new Date()));
  });

  it('dates are consecutive', () => {
    const dates = getNextNDates(3);
    expect(addDays(dates[0], 1)).toBe(dates[1]);
    expect(addDays(dates[1], 1)).toBe(dates[2]);
  });
});

describe('normalizeDateFormat', () => {
  it('adds leading zeros', () => {
    expect(normalizeDateFormat('1.2.2026')).toBe('01.02.2026');
  });

  it('keeps already normalized dates unchanged', () => {
    expect(normalizeDateFormat('01.02.2026')).toBe('01.02.2026');
  });

  it('returns invalid strings unchanged', () => {
    expect(normalizeDateFormat('not-a-date')).toBe('not-a-date');
  });

  it('handles single digit day', () => {
    expect(normalizeDateFormat('5.12.2026')).toBe('05.12.2026');
  });
});

describe('isDateAfterOrEqual', () => {
  it('returns true when first date is after', () => {
    expect(isDateAfterOrEqual('02.01.2026', '01.01.2026')).toBe(true);
  });

  it('returns true when dates are equal', () => {
    expect(isDateAfterOrEqual('01.01.2026', '01.01.2026')).toBe(true);
  });

  it('returns false when first date is before', () => {
    expect(isDateAfterOrEqual('01.01.2026', '02.01.2026')).toBe(false);
  });

  it('compares across years', () => {
    expect(isDateAfterOrEqual('01.01.2026', '31.12.2025')).toBe(true);
  });
});
