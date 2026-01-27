import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';

export const addUserMappingSchema = Joi.object({
  discordId: Joi.string().pattern(/^\d{17,19}$/).required(),
  discordUsername: Joi.string().min(1).max(32).required(),
  displayName: Joi.string().min(1).max(100).required(),
  role: Joi.string().valid('main', 'sub', 'coach').required(),
  sortOrder: Joi.number().integer().min(0).optional(), // Optional - wird automatisch berechnet
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
  vodUrl: Joi.string().uri().allow(''),
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
  vodUrl: Joi.string().uri().allow(''),
  notes: Joi.string().max(1000).allow(''),
});

export const createPollSchema = Joi.object({
  question: Joi.string().min(1).max(256).required(),
  options: Joi.array().items(Joi.string().min(1).max(100)).min(2).max(10).required(),
  duration: Joi.number().integer().min(1).max(168),
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
    trainingStartPollEnabled: Joi.boolean().required(),
    pollDurationMinutes: Joi.number().integer().min(15).max(180),
    cleanChannelBeforePost: Joi.boolean(),
    changeNotificationsEnabled: Joi.boolean(),
  }).required(),
  branding: Joi.object({
    teamName: Joi.string().min(1).max(50).required(),
    tagline: Joi.string().min(0).max(100).allow(''),
    logoUrl: Joi.string().uri().allow(''),
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

export function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim();
}
