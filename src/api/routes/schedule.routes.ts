import { Router } from 'express';
import { verifyToken, requireAdmin, AuthRequest, resolveCurrentUser, requireOwnershipOrAdmin } from '../../shared/middleware/auth.js';
import { sanitizeString } from '../../shared/middleware/validation.js';
import { updatePlayerAvailability } from '../../repositories/schedule.repository.js';
import { getScheduleDetails, getScheduleDetailsBatch } from '../../shared/utils/scheduleDetails.js';
import { isUserAbsentOnDate } from '../../repositories/absence.repository.js';
import { getScheduleStatus, checkAndNotifyStatusChange } from '../../bot/utils/schedule-poster.js';
import { logger } from '../../shared/utils/logger.js';
import type { ScheduleStatus } from '../../shared/types/types.js';

const router = Router();

// Get next 14 days schedule
router.get('/next14', verifyToken, async (req: AuthRequest, res) => {
  try {
    const { getNext14DaysSchedule } = await import('../../repositories/schedule.repository.js');
    const schedules = await getNext14DaysSchedule();
    res.json({ success: true, schedules });
  } catch (error) {
    logger.error('Error fetching next 14 days schedule', error instanceof Error ? error.message : String(error));
    res.status(500).json({ success: false, error: 'Failed to fetch schedule' });
  }
});

// Get schedules with pagination
router.get('/paginated', verifyToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { getSchedulesPaginated } = await import('../../repositories/schedule.repository.js');
    const offset = parseInt(req.query.offset as string) || 0;
    const result = await getSchedulesPaginated(offset);
    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('Error fetching paginated schedules', error instanceof Error ? error.message : String(error));
    res.status(500).json({ success: false, error: 'Failed to fetch schedules' });
  }
});

// Update schedule reason and focus
router.post('/update-reason', verifyToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { date, reason, focus } = req.body;

    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    // Capture old status before update (for change notification on reason change, e.g. Off Day)
    let oldStatus: ScheduleStatus | null = null;
    try {
      const oldState = await getScheduleStatus(date);
      oldStatus = oldState?.status ?? null;
    } catch (err) {
      logger.warn('Change notification: failed to capture old status (reason)', err instanceof Error ? err.message : String(err));
    }

    const { updateScheduleReason } = await import('../../repositories/schedule.repository.js');
    const sanitizedReason = sanitizeString(reason || '');
    const sanitizedFocus = sanitizeString(focus || '');
    const success = await updateScheduleReason(date, sanitizedReason, sanitizedFocus);

    if (success) {
      logger.success('Schedule reason updated', `${date} = ${reason}`);

      // Trigger change notification (fire and forget)
      if (oldStatus) {
        checkAndNotifyStatusChange(date, oldStatus).catch(err => {
          logger.error('Change notification promise rejected', err instanceof Error ? err.message : String(err));
        });
      }

      res.json({ success: true, message: 'Schedule reason updated successfully' });
    } else {
      res.status(500).json({ error: 'Failed to update schedule reason' });
    }
  } catch (error) {
    logger.error('Failed to update schedule reason', error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: 'Failed to update schedule reason' });
  }
});

// Update player availability
router.post('/update-availability', verifyToken, resolveCurrentUser, requireOwnershipOrAdmin(req => req.body?.userId), async (req: AuthRequest, res) => {
  try {
    const { date, userId, availability } = req.body;

    if (!date || !userId || availability === undefined) {
      return res.status(400).json({ error: 'Date, userId, and availability are required' });
    }

    // Check if user is absent on this date
    const isAbsent = await isUserAbsentOnDate(userId, date);
    if (isAbsent && req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Cannot edit availability during an absence period' });
    }

    // Capture old status before update (for change notification)
    let oldStatus: ScheduleStatus | null = null;
    try {
      const oldState = await getScheduleStatus(date);
      oldStatus = oldState?.status ?? null;
      logger.info('Change notification: captured old status', `${date}: ${oldStatus}`);
    } catch (err) {
      logger.warn('Change notification: failed to capture old status', err instanceof Error ? err.message : String(err));
    }

    const sanitizedValue = sanitizeString(availability);
    const success = await updatePlayerAvailability(date, userId, sanitizedValue);

    if (success) {
      logger.success('Availability updated', `${userId} for ${date} = ${availability}`);

      // Trigger change notification check (fire and forget)
      if (oldStatus) {
        checkAndNotifyStatusChange(date, oldStatus).catch(err => {
          logger.error('Change notification promise rejected', err instanceof Error ? err.message : String(err));
        });
      } else {
        logger.info('Change notification: skipped (no old status captured)');
      }

      res.json({ success: true, message: 'Availability updated successfully' });
    } else {
      res.status(500).json({ error: 'Failed to update availability' });
    }
  } catch (error) {
    logger.error('Failed to update availability', error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: 'Failed to update availability' });
  }
});

export default router;
