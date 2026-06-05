import type { Settings } from '../shared/utils/settingsManager.js';

type Scheduling = Settings['scheduling'];

const WEEKDAY_INDEX: Record<string, number> = {
  Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6,
};

/** Current wall-clock "HH:MM" in the given IANA timezone. */
export function hhmmInTz(date: Date, tz: string): string {
  return date.toLocaleString('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false });
}

/** Current weekday (0=Sunday … 6=Saturday) in the given timezone. */
export function weekdayInTz(date: Date, tz: string): number {
  const name = date.toLocaleString('en-US', { weekday: 'long', timeZone: tz });
  return WEEKDAY_INDEX[name] ?? date.getUTCDay();
}

/** "HH:MM" `hoursBefore` earlier than `postTime`, wrapping past midnight. */
export function timeBefore(postTime: string, hoursBefore: number): string {
  const [h, m] = postTime.split(':').map((n) => parseInt(n, 10));
  let hour = h - hoursBefore;
  while (hour < 0) hour += 24;
  return `${String(hour).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export interface DueActions {
  post: boolean;
  reminder: boolean;
  duplicateReminder: boolean;
  weeklyPing: boolean;
  weeklyTarget: 'current' | 'next';
}

/**
 * Decide which scheduled actions are due for an org at this exact minute, given
 * the org's settings and the current time (evaluated in the org's timezone).
 * Pure + deterministic → unit-testable. Mirrors the original cron semantics:
 * daily post at dailyPostTime; reminder(s) some hours before, skipped on weekly
 * planning days; weekly ping at weeklyPingTime on the configured weekdays
 * (Sunday targets next week, otherwise the current week).
 */
export function computeDue(s: Scheduling, now: Date, tz: string): DueActions {
  const t = hhmmInTz(now, tz);
  const dow = weekdayInTz(now, tz);
  const isWeeklyDay = s.weeklyPingEnabled && s.weeklyPingDays.includes(dow);

  const reminder = t === timeBefore(s.dailyPostTime, s.reminderHoursBefore) && !isWeeklyDay;
  const duplicateReminder =
    s.duplicateReminderEnabled &&
    t === timeBefore(s.dailyPostTime, s.duplicateReminderHoursBefore) &&
    !isWeeklyDay;

  return {
    post: t === s.dailyPostTime,
    reminder,
    duplicateReminder,
    weeklyPing: s.weeklyPingEnabled && s.weeklyPingDays.length > 0 && isWeeklyDay && t === s.weeklyPingTime,
    weeklyTarget: dow === 0 ? 'next' : 'current',
  };
}
