import { Router } from 'express';
import { verifyToken, AuthRequest, resolveCurrentUser, resolveTargetUser } from '../../shared/middleware/auth.js';
import { validate, recurringAvailabilitySchema, recurringAvailabilityBulkSchema } from '../../shared/middleware/validation.js';
import {
  getRecurringForUser,
  getRecurringForUserAndDay,
  setRecurring,
  removeRecurring,
  removeAllRecurringForUser,
} from '../../repositories/recurring-availability.repository.js';
import { getUserMapping } from '../../repositories/user-mapping.repository.js';
import {
  applyRecurringToEmptySchedules,
  clearRecurringFromSchedules,
} from '../../repositories/schedule.repository.js';
import { refreshWeeklyOverview } from '../../bot/utils/weekly-overview.js';
import { logger, getErrorMessage } from '../../shared/utils/logger.js';

const router = Router();

function syncRecurringInBackground(userId: string): void {
  applyRecurringToEmptySchedules(userId)
    .then(() => refreshWeeklyOverview())
    .catch(err => logger.error('Failed to apply recurring to schedules', err));
}

/**
 * GET /api/recurring-availability/my
 * Get the logged-in user's recurring schedule
 */
router.get('/my', verifyToken, resolveCurrentUser, async (req: AuthRequest, res) => {
  try {
    if (!req.resolvedUser) {
      // Admin account without user mapping - return empty
      return res.json({ entries: [] });
    }

    const entries = await getRecurringForUser(req.resolvedUser.discordId);
    res.json({ entries });
  } catch (error) {
    logger.error('Error fetching recurring availability', getErrorMessage(error));
    res.status(500).json({ error: 'Failed to fetch recurring availability' });
  }
});

/**
 * GET /api/recurring-availability?userId=ID
 * Get recurring schedule for a specific user (auth required)
 */
router.get('/', verifyToken, resolveCurrentUser, async (req: AuthRequest, res) => {
  try {
    const userId = req.query.userId as string;
    const isAdmin = req.user?.role === 'admin';

    if (userId) {
      // Non-admin users can only query their own
      if (!isAdmin && req.resolvedUser?.discordId !== userId) {
        return res.status(403).json({ error: 'You can only view your own recurring schedule' });
      }

      const entries = await getRecurringForUser(userId);
      res.json({ entries });
    } else {
      // No userId provided - resolve from JWT
      if (!req.resolvedUser) {
        return res.json({ entries: [] });
      }

      const entries = await getRecurringForUser(req.resolvedUser.discordId);
      res.json({ entries });
    }
  } catch (error) {
    logger.error('Error fetching recurring availability', getErrorMessage(error));
    res.status(500).json({ error: 'Failed to fetch recurring availability' });
  }
});

/**
 * POST /api/recurring-availability
 * Set recurring availability for a specific day
 * Body: { dayOfWeek: number, availability: string, userId?: string }
 */
router.post('/', verifyToken, validate(recurringAvailabilitySchema), resolveTargetUser, async (req: AuthRequest, res) => {
  try {
    const { dayOfWeek, availability } = req.body;
    const targetUserId = req.targetUserId!;

    const mapping = await getUserMapping(targetUserId);
    if (!mapping) {
      return res.status(400).json({ error: 'User is not registered in the roster' });
    }

    const entry = await setRecurring(targetUserId, dayOfWeek, availability);
    syncRecurringInBackground(targetUserId);

    res.json({ success: true, entry });
  } catch (error) {
    logger.error('Error setting recurring availability', getErrorMessage(error));
    res.status(500).json({ error: 'Failed to set recurring availability' });
  }
});

/**
 * POST /api/recurring-availability/bulk
 * Set recurring availability for multiple days at once
 * Body: { days: number[], availability: string, userId?: string }
 */
router.post('/bulk', verifyToken, validate(recurringAvailabilityBulkSchema), resolveTargetUser, async (req: AuthRequest, res) => {
  try {
    const { days, availability } = req.body;
    const targetUserId = req.targetUserId!;

    const mapping = await getUserMapping(targetUserId);
    if (!mapping) {
      return res.status(400).json({ error: 'User is not registered in the roster' });
    }

    let count = 0;
    for (const day of days as number[]) {
      if (day < 0 || day > 6) continue;
      await setRecurring(targetUserId, day, availability);
      count++;
    }

    logger.info('Bulk recurring set', `${targetUserId}: ${count} days → ${availability}`);
    syncRecurringInBackground(targetUserId);

    res.json({ success: true, count });
  } catch (error) {
    logger.error('Error bulk setting recurring availability', getErrorMessage(error));
    res.status(500).json({ error: 'Failed to bulk set recurring availability' });
  }
});

/**
 * DELETE /api/recurring-availability/:dayOfWeek
 * Remove recurring availability for a specific day
 */
router.delete('/:dayOfWeek', verifyToken, resolveTargetUser, async (req: AuthRequest, res) => {
  try {
    const dayOfWeek = parseInt(req.params.dayOfWeek as string);
    const targetUserId = req.targetUserId!;

    if (isNaN(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
      return res.status(400).json({ error: 'Invalid day of week (0-6)' });
    }

    // Fetch old value before deleting so we can clear matching schedule entries
    const oldEntry = await getRecurringForUserAndDay(targetUserId, dayOfWeek);
    const oldAvailability = oldEntry?.availability || '';

    await removeRecurring(targetUserId, dayOfWeek);

    if (oldAvailability) {
      clearRecurringFromSchedules(targetUserId, dayOfWeek, oldAvailability)
        .then(() => refreshWeeklyOverview())
        .catch(err => logger.error('Failed to clear recurring from schedules', err));
    }

    res.json({ success: true });
  } catch (error) {
    logger.error('Error removing recurring availability', getErrorMessage(error));
    res.status(500).json({ error: 'Failed to remove recurring availability' });
  }
});

/**
 * DELETE /api/recurring-availability
 * Remove all recurring availabilities for the user
 */
router.delete('/', verifyToken, resolveTargetUser, async (req: AuthRequest, res) => {
  try {
    const targetUserId = req.targetUserId!;
    const count = await removeAllRecurringForUser(targetUserId);
    res.json({ success: true, count });
  } catch (error) {
    logger.error('Error removing all recurring availability', getErrorMessage(error));
    res.status(500).json({ error: 'Failed to remove recurring availability' });
  }
});

export default router;
