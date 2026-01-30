import { describe, it, expect } from 'vitest';
import { parseSchedule, analyzeSchedule, getOverlapDuration } from '../analyzer.js';
import type { ScheduleData, SchedulePlayerData } from '../../types/types.js';

function makePlayer(overrides: Partial<SchedulePlayerData> & { userId: string }): SchedulePlayerData {
  return {
    displayName: overrides.displayName ?? overrides.userId,
    role: overrides.role ?? 'MAIN',
    availability: overrides.availability ?? '',
    sortOrder: overrides.sortOrder ?? 0,
    ...overrides,
  };
}

function makeScheduleData(players: SchedulePlayerData[], reason = 'Training'): ScheduleData {
  return { date: '15.01.2026', players, reason, focus: '' };
}

describe('parseSchedule', () => {
  it('parses available player with time range', () => {
    const data = makeScheduleData([makePlayer({ userId: '1', availability: '14:00-20:00' })]);
    const result = parseSchedule(data);
    expect(result.players[0].available).toBe(true);
    expect(result.players[0].timeRange).toEqual({ start: '14:00', end: '20:00' });
  });

  it('parses unavailable player (x)', () => {
    const data = makeScheduleData([makePlayer({ userId: '1', availability: 'x' })]);
    const result = parseSchedule(data);
    expect(result.players[0].available).toBe(false);
    expect(result.players[0].rawValue).toBe('x');
  });

  it('parses unavailable player (X)', () => {
    const data = makeScheduleData([makePlayer({ userId: '1', availability: 'X' })]);
    const result = parseSchedule(data);
    expect(result.players[0].available).toBe(false);
  });

  it('parses no-response player (empty)', () => {
    const data = makeScheduleData([makePlayer({ userId: '1', availability: '' })]);
    const result = parseSchedule(data);
    expect(result.players[0].available).toBe(false);
    expect(result.players[0].rawValue).toBe('');
  });

  it('marks absent players', () => {
    const data = makeScheduleData([makePlayer({ userId: '1', availability: '14:00-20:00' })]);
    const result = parseSchedule(data, ['1']);
    expect(result.players[0].available).toBe(false);
    expect(result.players[0].isAbsent).toBe(true);
    expect(result.players[0].rawValue).toBe('absent');
  });

  it('preserves date and reason', () => {
    const data = makeScheduleData([], 'Scrim Day');
    const result = parseSchedule(data);
    expect(result.date).toBe('15.01.2026');
    expect(result.reason).toBe('Scrim Day');
  });
});

describe('analyzeSchedule', () => {
  function fiveMainPlayers(availability = '14:00-20:00') {
    return Array.from({ length: 5 }, (_, i) =>
      makePlayer({ userId: String(i), role: 'MAIN', availability })
    );
  }

  it('detects OFF_DAY from reason', () => {
    const data = makeScheduleData(fiveMainPlayers(), 'Day off');
    const schedule = parseSchedule(data);
    const result = analyzeSchedule(schedule);
    expect(result.status).toBe('OFF_DAY');
    expect(result.canProceed).toBe(false);
  });

  it('detects FULL_ROSTER with 5 mains', () => {
    const data = makeScheduleData(fiveMainPlayers());
    const schedule = parseSchedule(data);
    const result = analyzeSchedule(schedule);
    expect(result.status).toBe('FULL_ROSTER');
    expect(result.canProceed).toBe(true);
    expect(result.availableMainCount).toBe(5);
  });

  it('detects WITH_SUBS when 4 mains + 1 sub', () => {
    const players = [
      ...Array.from({ length: 4 }, (_, i) => makePlayer({ userId: String(i), role: 'MAIN', availability: '14:00-20:00' })),
      makePlayer({ userId: '4', role: 'MAIN', availability: 'x' }),
      makePlayer({ userId: '5', role: 'SUB', availability: '14:00-20:00' }),
    ];
    const schedule = parseSchedule(makeScheduleData(players));
    const result = analyzeSchedule(schedule);
    expect(result.status).toBe('WITH_SUBS');
    expect(result.canProceed).toBe(true);
    expect(result.requiredSubs).toHaveLength(1);
  });

  it('detects NOT_ENOUGH when too few players', () => {
    const players = [
      makePlayer({ userId: '1', role: 'MAIN', availability: '14:00-20:00' }),
      makePlayer({ userId: '2', role: 'MAIN', availability: 'x' }),
    ];
    const schedule = parseSchedule(makeScheduleData(players));
    const result = analyzeSchedule(schedule);
    expect(result.status).toBe('NOT_ENOUGH');
    expect(result.canProceed).toBe(false);
  });

  it('calculates common time range intersection', () => {
    const players = [
      makePlayer({ userId: '1', role: 'MAIN', availability: '14:00-22:00' }),
      makePlayer({ userId: '2', role: 'MAIN', availability: '16:00-20:00' }),
      makePlayer({ userId: '3', role: 'MAIN', availability: '15:00-21:00' }),
      makePlayer({ userId: '4', role: 'MAIN', availability: '14:00-20:00' }),
      makePlayer({ userId: '5', role: 'MAIN', availability: '13:00-19:00' }),
    ];
    const schedule = parseSchedule(makeScheduleData(players));
    const result = analyzeSchedule(schedule);
    // Latest start: 16:00, Earliest end: 19:00
    expect(result.commonTimeRange).toEqual({ start: '16:00', end: '19:00' });
  });

  it('returns null common time range when no overlap', () => {
    const players = [
      makePlayer({ userId: '1', role: 'MAIN', availability: '08:00-12:00' }),
      makePlayer({ userId: '2', role: 'MAIN', availability: '14:00-20:00' }),
      makePlayer({ userId: '3', role: 'MAIN', availability: '08:00-12:00' }),
      makePlayer({ userId: '4', role: 'MAIN', availability: '14:00-20:00' }),
      makePlayer({ userId: '5', role: 'MAIN', availability: '08:00-12:00' }),
    ];
    const schedule = parseSchedule(makeScheduleData(players));
    const result = analyzeSchedule(schedule);
    expect(result.commonTimeRange).toBeNull();
  });

  it('counts coaches separately', () => {
    const players = [
      ...fiveMainPlayers(),
      makePlayer({ userId: '10', role: 'COACH', availability: '14:00-20:00' }),
    ];
    const schedule = parseSchedule(makeScheduleData(players));
    const result = analyzeSchedule(schedule);
    expect(result.availableCoachCount).toBe(1);
  });
});

describe('getOverlapDuration', () => {
  it('returns 0 for null', () => {
    expect(getOverlapDuration(null)).toBe(0);
  });

  it('calculates duration in minutes', () => {
    expect(getOverlapDuration({ start: '14:00', end: '20:00' })).toBe(360);
  });

  it('handles 1-hour window', () => {
    expect(getOverlapDuration({ start: '18:00', end: '19:00' })).toBe(60);
  });
});
