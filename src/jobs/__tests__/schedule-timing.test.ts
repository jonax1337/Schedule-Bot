import { describe, it, expect } from 'vitest';
import { computeDue, timeBefore, hhmmInTz, weekdayInTz } from '../schedule-timing.js';
import type { Settings } from '../../shared/utils/settingsManager.js';

const TZ = 'Europe/Berlin'; // January → fixed UTC+1, no DST surprises

function scheduling(overrides: Partial<Settings['scheduling']> = {}): Settings['scheduling'] {
  return {
    dailyPostTime: '18:00',
    reminderHoursBefore: 2, // → 16:00
    duplicateReminderEnabled: false,
    duplicateReminderHoursBefore: 1, // → 17:00
    trainingStartPollEnabled: false,
    pollDurationMinutes: 60,
    timezone: TZ,
    cleanChannelBeforePost: false,
    changeNotificationsEnabled: true,
    weeklyPingEnabled: true,
    weeklyPingTime: '12:00',
    weeklyPingDays: [0], // Sunday only
    ...overrides,
  };
}

// Jan 2026: 4th = Sunday, 5th = Monday, 6th = Tuesday.
const tueAt = (hhmmZ: string) => new Date(`2026-01-06T${hhmmZ}:00Z`); // Berlin = +1h
const sunAt = (hhmmZ: string) => new Date(`2026-01-04T${hhmmZ}:00Z`);

describe('schedule-timing helpers', () => {
  it('hhmmInTz / weekdayInTz convert to the org timezone', () => {
    expect(hhmmInTz(tueAt('17:00'), TZ)).toBe('18:00');
    expect(weekdayInTz(tueAt('17:00'), TZ)).toBe(2); // Tuesday
    expect(weekdayInTz(sunAt('11:00'), TZ)).toBe(0); // Sunday
  });

  it('timeBefore subtracts hours and wraps past midnight', () => {
    expect(timeBefore('18:00', 2)).toBe('16:00');
    expect(timeBefore('01:00', 3)).toBe('22:00');
  });
});

describe('computeDue', () => {
  it('fires the daily post at the post time', () => {
    const d = computeDue(scheduling(), tueAt('17:00'), TZ); // Berlin 18:00 Tue
    expect(d.post).toBe(true);
    expect(d.reminder).toBe(false);
    expect(d.weeklyPing).toBe(false);
  });

  it('fires the reminder N hours before (on a non-weekly day)', () => {
    const d = computeDue(scheduling(), tueAt('15:00'), TZ); // Berlin 16:00 Tue
    expect(d.reminder).toBe(true);
    expect(d.post).toBe(false);
  });

  it('skips the reminder on a weekly planning day', () => {
    const d = computeDue(scheduling({ weeklyPingDays: [2] }), tueAt('15:00'), TZ); // Tue is now a weekly day
    expect(d.reminder).toBe(false);
  });

  it('fires the duplicate reminder only when enabled', () => {
    expect(computeDue(scheduling(), tueAt('16:00'), TZ).duplicateReminder).toBe(false); // Berlin 17:00, disabled
    expect(computeDue(scheduling({ duplicateReminderEnabled: true }), tueAt('16:00'), TZ).duplicateReminder).toBe(true);
  });

  it('fires the weekly ping on its day/time and targets next week on Sunday', () => {
    const d = computeDue(scheduling(), sunAt('11:00'), TZ); // Berlin 12:00 Sunday
    expect(d.weeklyPing).toBe(true);
    expect(d.weeklyTarget).toBe('next');
  });

  it('fires nothing at an idle minute', () => {
    const d = computeDue(scheduling(), tueAt('08:00'), TZ); // Berlin 09:00 Tue
    expect(d.post || d.reminder || d.duplicateReminder || d.weeklyPing).toBe(false);
  });
});
