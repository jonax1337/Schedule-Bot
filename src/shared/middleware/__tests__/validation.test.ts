import { describe, it, expect } from 'vitest';
import {
  addUserMappingSchema,
  addScrimSchema,
  createPollSchema,
  notificationSchema,
  settingsSchema,
  absenceCreateSchema,
  recurringAvailabilitySchema,
  reorderUserMappingsSchema,
  isValidDateFormat,
  sanitizeString,
} from '../validation.js';

describe('isValidDateFormat', () => {
  it('accepts valid DD.MM.YYYY', () => {
    expect(isValidDateFormat('01.01.2026')).toBe(true);
    expect(isValidDateFormat('31.12.2025')).toBe(true);
  });

  it('rejects invalid formats', () => {
    expect(isValidDateFormat('2026-01-01')).toBe(false);
    expect(isValidDateFormat('1.1.2026')).toBe(false);
    expect(isValidDateFormat('')).toBe(false);
  });
});

describe('sanitizeString', () => {
  it('removes HTML tags', () => {
    expect(sanitizeString('<script>alert("xss")</script>')).toBe('alert("xss")');
  });

  it('removes javascript: scheme', () => {
    expect(sanitizeString('javascript:alert(1)')).toBe('alert(1)');
  });

  it('removes event handlers', () => {
    expect(sanitizeString('onerror=alert(1)')).toBe('alert(1)');
  });

  it('removes HTML entities', () => {
    expect(sanitizeString('&#x3C;script&#x3E;')).toBe('script');
  });

  it('trims whitespace', () => {
    expect(sanitizeString('  hello  ')).toBe('hello');
  });

  it('leaves clean strings unchanged', () => {
    expect(sanitizeString('Hello World')).toBe('Hello World');
  });
});

describe('addUserMappingSchema', () => {
  const validMapping = {
    discordId: '12345678901234567',
    discordUsername: 'testuser',
    displayName: 'Test User',
    role: 'main',
  };

  it('accepts valid input', () => {
    const { error } = addUserMappingSchema.validate(validMapping);
    expect(error).toBeUndefined();
  });

  it('rejects invalid discord ID (too short)', () => {
    const { error } = addUserMappingSchema.validate({ ...validMapping, discordId: '123' });
    expect(error).toBeDefined();
  });

  it('rejects invalid role', () => {
    const { error } = addUserMappingSchema.validate({ ...validMapping, role: 'invalid' });
    expect(error).toBeDefined();
  });

  it('rejects missing required fields', () => {
    const { error } = addUserMappingSchema.validate({});
    expect(error).toBeDefined();
  });
});

describe('addScrimSchema', () => {
  const validScrim = {
    date: '15.01.2026',
    opponent: 'Team A',
    result: 'win',
    scoreUs: 13,
    scoreThem: 7,
  };

  it('accepts valid input', () => {
    const { error } = addScrimSchema.validate(validScrim);
    expect(error).toBeUndefined();
  });

  it('rejects invalid date format', () => {
    const { error } = addScrimSchema.validate({ ...validScrim, date: '2026-01-15' });
    expect(error).toBeDefined();
  });

  it('rejects score over 100', () => {
    const { error } = addScrimSchema.validate({ ...validScrim, scoreUs: 101 });
    expect(error).toBeDefined();
  });
});

describe('createPollSchema', () => {
  it('accepts valid poll', () => {
    const { error } = createPollSchema.validate({
      question: 'When to play?',
      options: ['Monday', 'Tuesday'],
    });
    expect(error).toBeUndefined();
  });

  it('rejects too few options', () => {
    const { error } = createPollSchema.validate({
      question: 'When?',
      options: ['Only one'],
    });
    expect(error).toBeDefined();
  });

  it('rejects duration over 10080', () => {
    const { error } = createPollSchema.validate({
      question: 'When?',
      options: ['A', 'B'],
      duration: 99999,
    });
    expect(error).toBeDefined();
  });
});

describe('absenceCreateSchema', () => {
  it('accepts valid absence', () => {
    const { error } = absenceCreateSchema.validate({
      startDate: '01.01.2026',
      endDate: '05.01.2026',
      reason: 'Vacation',
    });
    expect(error).toBeUndefined();
  });

  it('rejects invalid date format', () => {
    const { error } = absenceCreateSchema.validate({
      startDate: '1.1.2026',
      endDate: '05.01.2026',
    });
    expect(error).toBeDefined();
  });
});

describe('recurringAvailabilitySchema', () => {
  it('accepts time range', () => {
    const { error } = recurringAvailabilitySchema.validate({
      dayOfWeek: 1,
      availability: '14:00-20:00',
    });
    expect(error).toBeUndefined();
  });

  it('accepts x for unavailable', () => {
    const { error } = recurringAvailabilitySchema.validate({
      dayOfWeek: 0,
      availability: 'x',
    });
    expect(error).toBeUndefined();
  });

  it('rejects day out of range', () => {
    const { error } = recurringAvailabilitySchema.validate({
      dayOfWeek: 7,
      availability: '14:00-20:00',
    });
    expect(error).toBeDefined();
  });

  it('rejects invalid availability format', () => {
    const { error } = recurringAvailabilitySchema.validate({
      dayOfWeek: 1,
      availability: 'maybe',
    });
    expect(error).toBeDefined();
  });
});

describe('reorderUserMappingsSchema', () => {
  it('accepts valid orderings', () => {
    const { error } = reorderUserMappingsSchema.validate({
      orderings: [
        { discordId: '123', sortOrder: 0 },
        { discordId: '456', sortOrder: 1 },
      ],
    });
    expect(error).toBeUndefined();
  });

  it('rejects empty orderings', () => {
    const { error } = reorderUserMappingsSchema.validate({ orderings: [] });
    expect(error).toBeDefined();
  });
});

describe('settingsSchema', () => {
  const validSettings = {
    discord: {
      channelId: '12345678901234567',
      pingRoleId: '',
      allowDiscordAuth: false,
    },
    scheduling: {
      dailyPostTime: '12:00',
      timezone: 'Europe/Berlin',
      reminderHoursBefore: 2,
      trainingStartPollEnabled: false,
    },
    branding: {
      teamName: 'My Team',
      tagline: '',
      logoUrl: '',
    },
    stratbook: {
      editPermission: 'admin',
    },
    tracker: {
      henrikApiKey: '',
      region: 'eu',
    },
  };

  it('accepts valid settings', () => {
    const { error } = settingsSchema.validate(validSettings);
    expect(error).toBeUndefined();
  });

  it('rejects invalid time format', () => {
    const { error } = settingsSchema.validate({
      ...validSettings,
      scheduling: { ...validSettings.scheduling, dailyPostTime: 'not-a-time' },
    });
    expect(error).toBeDefined();
  });

  it('rejects missing branding', () => {
    const { discord, scheduling } = validSettings;
    const { error } = settingsSchema.validate({ discord, scheduling });
    expect(error).toBeDefined();
  });
});
