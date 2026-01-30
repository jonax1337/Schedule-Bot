import { Router } from 'express';
import { verifyToken, AuthRequest } from '../../shared/middleware/auth.js';
import { validate, recurringAvailabilitySchema, recurringAvailabilityBulkSchema } from '../../shared/middleware/validation.js';
import { recurringAvailabilityService } from '../../services/recurring-availability.service.js';
import { getUserMappings } from '../../repositories/user-mapping.repository.js';
import { logger } from '../../shared/utils/logger.js';

const router = Router();

/**
 * Resolve the Discord ID for the logged-in user from user mappings
 */
async function resolveDiscordId(req: AuthRequest): Promise<string | null> {
  const mappings = await getUserMappings();
  const userMapping = mappings.find(m => m.displayName === req.user?.username);
  return userMapping?.discordId || null;
}

/**
 * GET /api/recurring-availability/my
 * Get the logged-in user's recurring schedule
 */
router.get('/my', verifyToken, async (req: AuthRequest, res) => {
  try {
    const discordId = await resolveDiscordId(req);
    if (!discordId) {
      return res.json({ entries: [] });
    }

    const entries = await recurringAvailabilityService.getForUser(discordId);
    res.json({ entries });
  } catch (error) {
    logger.error('Error fetching recurring availability', error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: 'Failed to fetch recurring availability' });
  }
});

/**
 * GET /api/recurring-availability?userId=ID
 * Get recurring schedule for a specific user (auth required)
 */
router.get('/', verifyToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.query.userId as string;
    const isAdmin = req.user?.role === 'admin';

    let targetUserId = userId;
    if (!targetUserId) {
      const discordId = await resolveDiscordId(req);
      if (!discordId) {
        return res.json({ entries: [] });
      }
      targetUserId = discordId;
    }

    // Non-admin can only query their own
    if (!isAdmin && userId) {
      const discordId = await resolveDiscordId(req);
      if (discordId !== userId) {
        return res.status(403).json({ error: 'You can only view your own recurring schedule' });
      }
    }

    const entries = await recurringAvailabilityService.getForUser(targetUserId);
    res.json({ entries });
  } catch (error) {
    logger.error('Error fetching recurring availability', error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: 'Failed to fetch recurring availability' });
  }
});

/**
 * POST /api/recurring-availability
 * Set recurring availability for a specific day
 * Body: { dayOfWeek: number, availability: string, userId?: string }
 */
router.post('/', verifyToken, validate(recurringAvailabilitySchema), async (req: AuthRequest, res) => {
  try {
    const { dayOfWeek, availability, userId } = req.body;
    const isAdmin = req.user?.role === 'admin';

    let targetUserId = userId;
    if (!targetUserId) {
      const discordId = await resolveDiscordId(req);
      if (!discordId) {
        return res.status(400).json({ error: 'Your account is not linked to a player in the roster. Please log in as a player, not as admin.' });
      }
      targetUserId = discordId;
    } else if (!isAdmin) {
      // Non-admin trying to set for another user
      const discordId = await resolveDiscordId(req);
      if (discordId !== targetUserId) {
        return res.status(403).json({ error: 'You can only manage your own recurring schedule' });
      }
    }

    const result = await recurringAvailabilityService.set(
      targetUserId,
      dayOfWeek,
      availability,
      isAdmin ? undefined : targetUserId
    );

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ success: true, entry: result.data });
  } catch (error) {
    logger.error('Error setting recurring availability', error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: 'Failed to set recurring availability' });
  }
});

/**
 * POST /api/recurring-availability/bulk
 * Set recurring availability for multiple days at once
 * Body: { days: number[], availability: string, userId?: string }
 */
router.post('/bulk', verifyToken, validate(recurringAvailabilityBulkSchema), async (req: AuthRequest, res) => {
  try {
    const { days, availability, userId } = req.body;
    const isAdmin = req.user?.role === 'admin';

    let targetUserId = userId;
    if (!targetUserId) {
      const discordId = await resolveDiscordId(req);
      if (!discordId) {
        return res.status(400).json({ error: 'Your account is not linked to a player in the roster. Please log in as a player, not as admin.' });
      }
      targetUserId = discordId;
    } else if (!isAdmin) {
      const discordId = await resolveDiscordId(req);
      if (discordId !== targetUserId) {
        return res.status(403).json({ error: 'You can only manage your own recurring schedule' });
      }
    }

    const result = await recurringAvailabilityService.setBulk(
      targetUserId,
      days,
      availability,
      isAdmin ? undefined : targetUserId
    );

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ success: true, count: result.count });
  } catch (error) {
    logger.error('Error bulk setting recurring availability', error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: 'Failed to bulk set recurring availability' });
  }
});

/**
 * DELETE /api/recurring-availability/:dayOfWeek
 * Remove recurring availability for a specific day
 */
router.delete('/:dayOfWeek', verifyToken, async (req: AuthRequest, res) => {
  try {
    const dayOfWeek = parseInt(req.params.dayOfWeek as string);
    const isAdmin = req.user?.role === 'admin';
    const userId = req.query.userId as string;

    if (isNaN(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
      return res.status(400).json({ error: 'Invalid day of week (0-6)' });
    }

    let targetUserId = userId;
    if (!targetUserId) {
      const discordId = await resolveDiscordId(req);
      if (!discordId) {
        return res.status(400).json({ error: 'Your account is not linked to a player in the roster.' });
      }
      targetUserId = discordId;
    } else if (!isAdmin) {
      const discordId = await resolveDiscordId(req);
      if (discordId !== targetUserId) {
        return res.status(403).json({ error: 'You can only manage your own recurring schedule' });
      }
    }

    const result = await recurringAvailabilityService.remove(
      targetUserId,
      dayOfWeek,
      isAdmin ? undefined : targetUserId
    );

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ success: true });
  } catch (error) {
    logger.error('Error removing recurring availability', error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: 'Failed to remove recurring availability' });
  }
});

/**
 * DELETE /api/recurring-availability
 * Remove all recurring availabilities for the user
 */
router.delete('/', verifyToken, async (req: AuthRequest, res) => {
  try {
    const isAdmin = req.user?.role === 'admin';
    const userId = req.query.userId as string;

    let targetUserId = userId;
    if (!targetUserId) {
      const discordId = await resolveDiscordId(req);
      if (!discordId) {
        return res.status(400).json({ error: 'Your account is not linked to a player in the roster.' });
      }
      targetUserId = discordId;
    } else if (!isAdmin) {
      const discordId = await resolveDiscordId(req);
      if (discordId !== targetUserId) {
        return res.status(403).json({ error: 'You can only manage your own recurring schedule' });
      }
    }

    const result = await recurringAvailabilityService.removeAll(
      targetUserId,
      isAdmin ? undefined : targetUserId
    );

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ success: true, count: result.count });
  } catch (error) {
    logger.error('Error removing all recurring availability', error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: 'Failed to remove recurring availability' });
  }
});

export default router;
