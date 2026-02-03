import { Router } from 'express';
import { verifyToken, AuthRequest, resolveCurrentUser, resolveTargetUser } from '../../shared/middleware/auth.js';
import { validate, recurringAvailabilitySchema, recurringAvailabilityBulkSchema } from '../../shared/middleware/validation.js';
import { recurringAvailabilityService } from '../../services/recurring-availability.service.js';
import { sendOk, sendError, sendServerError, sendForbidden } from '../../shared/utils/apiResponse.js';

const router = Router();

/**
 * GET /api/recurring-availability/my
 * Get the logged-in user's recurring schedule
 */
router.get('/my', verifyToken, resolveCurrentUser, async (req: AuthRequest, res) => {
  try {
    if (!req.resolvedUser) {
      // Admin account without user mapping - return empty
      return sendOk(res, { entries: [] });
    }

    const entries = await recurringAvailabilityService.getForUser(req.resolvedUser.discordId);
    return sendOk(res, { entries });
  } catch (error) {
    return sendServerError(res, error, 'Fetch recurring availability');
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
        return sendForbidden(res, 'You can only view your own recurring schedule');
      }

      const entries = await recurringAvailabilityService.getForUser(userId);
      return sendOk(res, { entries });
    } else {
      // No userId provided - resolve from JWT
      if (!req.resolvedUser) {
        return sendOk(res, { entries: [] });
      }

      const entries = await recurringAvailabilityService.getForUser(req.resolvedUser.discordId);
      return sendOk(res, { entries });
    }
  } catch (error) {
    return sendServerError(res, error, 'Fetch recurring availability');
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
    const isAdmin = req.user?.role === 'admin';
    const targetUserId = req.targetUserId!;

    const result = await recurringAvailabilityService.set(
      targetUserId,
      dayOfWeek,
      availability,
      isAdmin ? undefined : targetUserId
    );

    if (!result.success) {
      return sendError(res, result.error || 'Failed to set recurring availability');
    }

    return sendOk(res, { entry: result.data });
  } catch (error) {
    return sendServerError(res, error, 'Set recurring availability');
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
    const isAdmin = req.user?.role === 'admin';
    const targetUserId = req.targetUserId!;

    const result = await recurringAvailabilityService.setBulk(
      targetUserId,
      days,
      availability,
      isAdmin ? undefined : targetUserId
    );

    if (!result.success) {
      return sendError(res, result.error || 'Failed to bulk set recurring availability');
    }

    return sendOk(res, { count: result.count });
  } catch (error) {
    return sendServerError(res, error, 'Bulk set recurring availability');
  }
});

/**
 * DELETE /api/recurring-availability/:dayOfWeek
 * Remove recurring availability for a specific day
 */
router.delete('/:dayOfWeek', verifyToken, resolveTargetUser, async (req: AuthRequest, res) => {
  try {
    const dayOfWeek = parseInt(req.params.dayOfWeek as string);
    const isAdmin = req.user?.role === 'admin';
    const targetUserId = req.targetUserId!;

    if (isNaN(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
      return sendError(res, 'Invalid day of week (0-6)');
    }

    const result = await recurringAvailabilityService.remove(
      targetUserId,
      dayOfWeek,
      isAdmin ? undefined : targetUserId
    );

    if (!result.success) {
      return sendError(res, result.error || 'Failed to remove recurring availability');
    }

    return sendOk(res, {});
  } catch (error) {
    return sendServerError(res, error, 'Remove recurring availability');
  }
});

/**
 * DELETE /api/recurring-availability
 * Remove all recurring availabilities for the user
 */
router.delete('/', verifyToken, resolveTargetUser, async (req: AuthRequest, res) => {
  try {
    const isAdmin = req.user?.role === 'admin';
    const targetUserId = req.targetUserId!;

    const result = await recurringAvailabilityService.removeAll(
      targetUserId,
      isAdmin ? undefined : targetUserId
    );

    if (!result.success) {
      return sendError(res, result.error || 'Failed to remove recurring availability');
    }

    return sendOk(res, { count: result.count });
  } catch (error) {
    return sendServerError(res, error, 'Remove all recurring availability');
  }
});

export default router;
