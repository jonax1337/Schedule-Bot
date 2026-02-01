import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';

export const addUserMappingSchema = Joi.object({
  discordId: Joi.string().pattern(/^\d{17,19}$/).required(),
  discordUsername: Joi.string().min(1).max(32).required(),
  displayName: Joi.string().min(1).max(100).required(),
  role: Joi.string().valid('main', 'sub', 'coach').required(),
  sortOrder: Joi.number().integer().min(0).optional(), // Optional - wird automatisch berechnet
  timezone: Joi.string().max(100).allow('', null).optional(),
  isAdmin: Joi.boolean().optional(),
});

export const addScrimSchema = Joi.object({
  date: Joi.string().pattern(/^\d{2}\.\d{2}\.\d{4}$/).required(),
  opponent: Joi.string().min(1).max(100).required(),
  result: Joi.string().valid('win', 'loss', 'draw').required(),
  scoreUs: Joi.number().integer().min(0).max(100).required(),
  scoreThem: Joi.number().integer().min(0).max(100).required(),
  map: Joi.string().max(50).allow(''),
  matchType: Joi.string().max(50).allow(''),
  ourAgents: Joi.array().items(Joi.string().max(50)).max(5),
  theirAgents: Joi.array().items(Joi.string().max(50)).max(5),
  vodUrl: Joi.string().uri({ scheme: ['http', 'https'] }).allow(''),
  matchLink: Joi.string().uri({ scheme: ['http', 'https'] }).allow(''),
  notes: Joi.string().max(1000).allow(''),
});

export const updateScrimSchema = Joi.object({
  date: Joi.string().pattern(/^\d{2}\.\d{2}\.\d{4}$/),
  opponent: Joi.string().min(1).max(100),
  result: Joi.string().valid('win', 'loss', 'draw'),
  scoreUs: Joi.number().integer().min(0).max(100),
  scoreThem: Joi.number().integer().min(0).max(100),
  map: Joi.string().max(50).allow(''),
  matchType: Joi.string().max(50).allow(''),
  ourAgents: Joi.array().items(Joi.string().max(50)).max(5),
  theirAgents: Joi.array().items(Joi.string().max(50)).max(5),
  vodUrl: Joi.string().uri({ scheme: ['http', 'https'] }).allow(''),
  matchLink: Joi.string().uri({ scheme: ['http', 'https'] }).allow(''),
  notes: Joi.string().max(1000).allow(''),
});

export const createPollSchema = Joi.object({
  question: Joi.string().min(1).max(256).required(),
  options: Joi.array().items(Joi.string().min(1).max(100)).min(2).max(10).required(),
  duration: Joi.number().integer().min(1).max(10080),
});

export const notificationSchema = Joi.object({
  type: Joi.string().valid('info', 'success', 'warning', 'error').required(),
  target: Joi.string().valid('all', 'main', 'sub', 'coach').required(),
  specificUserId: Joi.string().pattern(/^\d{17,19}$/).allow('', null),
  title: Joi.string().min(1).max(256).required(),
  message: Joi.string().min(1).max(2000).required(),
});

export const settingsSchema = Joi.object({
  discord: Joi.object({
    channelId: Joi.string().pattern(/^\d{17,19}$/).required(),
    pingRoleId: Joi.string().pattern(/^\d{17,19}$/).allow('', null),
    allowDiscordAuth: Joi.boolean(),
  }).required(),
  scheduling: Joi.object({
    dailyPostTime: Joi.string().pattern(/^\d{2}:\d{2}$/).required(),
    timezone: Joi.string().min(1).max(50).required(),
    reminderHoursBefore: Joi.number().integer().min(0).max(24).required(),
    duplicateReminderEnabled: Joi.boolean(),
    duplicateReminderHoursBefore: Joi.number().integer().min(0).max(24),
    trainingStartPollEnabled: Joi.boolean().required(),
    pollDurationMinutes: Joi.number().integer().min(1).max(10080),
    cleanChannelBeforePost: Joi.boolean(),
    changeNotificationsEnabled: Joi.boolean(),
  }).required(),
  branding: Joi.object({
    teamName: Joi.string().min(1).max(50).required(),
    tagline: Joi.string().min(0).max(100).allow(''),
    logoUrl: Joi.string().uri({ scheme: ['http', 'https'] }).allow(''),
  }).required(),
  stratbook: Joi.object({
    editPermission: Joi.string().valid('admin', 'all').required(),
  }).required(),
});

export function validate(schema: Joi.ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      res.status(400).json({ 
        error: 'Validation failed', 
        details: errors,
      });
      return;
    }

    req.body = value;
    next();
  };
}

// Date format validation helper (DD.MM.YYYY)
const datePattern = /^\d{2}\.\d{2}\.\d{4}$/;

export const absenceCreateSchema = Joi.object({
  userId: Joi.string().pattern(/^\d{17,19}$/).optional(),
  startDate: Joi.string().pattern(datePattern).required(),
  endDate: Joi.string().pattern(datePattern).required(),
  reason: Joi.string().max(500).allow(''),
});

export const absenceUpdateSchema = Joi.object({
  startDate: Joi.string().pattern(datePattern),
  endDate: Joi.string().pattern(datePattern),
  reason: Joi.string().max(500).allow(''),
}).min(1);

export const reorderUserMappingsSchema = Joi.object({
  orderings: Joi.array().items(
    Joi.object({
      discordId: Joi.string().min(1).required(),
      sortOrder: Joi.number().integer().min(0).required(),
    })
  ).min(1).required(),
});

export const updateUserMappingSchema = Joi.object({
  discordId: Joi.string().pattern(/^\d{17,19}$/),
  discordUsername: Joi.string().min(1).max(32),
  displayName: Joi.string().min(1).max(100).required(),
  role: Joi.string().valid('main', 'sub', 'coach').required(),
  sortOrder: Joi.number().integer().min(0).optional(),
  timezone: Joi.string().max(100).allow('', null).optional(),
  isAdmin: Joi.boolean().optional(),
});

export const recurringAvailabilitySchema = Joi.object({
  dayOfWeek: Joi.number().integer().min(0).max(6).required(),
  availability: Joi.string().pattern(/^(\d{2}:\d{2}-\d{2}:\d{2}|x|X)$/).required(),
  userId: Joi.string().pattern(/^\d{17,19}$/).optional(),
});

export const recurringAvailabilityBulkSchema = Joi.object({
  days: Joi.array().items(Joi.number().integer().min(0).max(6)).min(1).max(7).required(),
  availability: Joi.string().pattern(/^(\d{2}:\d{2}-\d{2}:\d{2}|x|X)$/).required(),
  userId: Joi.string().pattern(/^\d{17,19}$/).optional(),
});

export const createStrategySchema = Joi.object({
  title: Joi.string().min(1).max(200).required(),
  map: Joi.string().max(50).allow('', null),
  side: Joi.string().valid('Attack', 'Defense', '', null).allow(null),
  tags: Joi.string().max(500).allow(''),
  agents: Joi.string().max(500).allow(''),
  content: Joi.object().required(),
  folderId: Joi.number().integer().allow(null),
});

export const updateStrategySchema = Joi.object({
  title: Joi.string().min(1).max(200),
  map: Joi.string().max(50).allow('', null),
  side: Joi.string().valid('Attack', 'Defense', '', null).allow(null),
  tags: Joi.string().max(500).allow(''),
  agents: Joi.string().max(500).allow(''),
  content: Joi.object(),
}).min(1);

export function isValidDateFormat(date: string): boolean {
  return datePattern.test(date);
}

export function sanitizeString(input: string): string {
  return input
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    .replace(/[<>]/g, '')
    // Remove dangerous URI schemes
    .replace(/javascript\s*:/gi, '')
    .replace(/vbscript\s*:/gi, '')
    .replace(/data\s*:/gi, '')
    // Remove event handlers (on* attributes)
    .replace(/on\w+\s*=/gi, '')
    // Remove expression/url patterns used in CSS injection
    .replace(/expression\s*\(/gi, '')
    // Remove HTML entities that could bypass filters
    .replace(/&#x?[0-9a-f]+;?/gi, '')
    .trim();
}
