import { Router } from 'express';
import { verifyToken, requireAdmin, optionalAuth, AuthRequest } from '../../shared/middleware/auth.js';
import { sanitizeString } from '../../shared/middleware/validation.js';
import { getUserMappings } from '../../repositories/user-mapping.repository.js';
import { updatePlayerAvailability } from '../../repositories/schedule.repository.js';
import { getScheduleDetails, getScheduleDetailsBatch } from '../../shared/utils/scheduleDetails.js';
import { isUserAbsentOnDate } from '../../repositories/absence.repository.js';
import { getScheduleStatus, checkAndNotifyStatusChange } from '../../bot/utils/schedule-poster.js';
import { logger } from '../../shared/utils/logger.js';
import { loadSettings } from '../../shared/utils/settingsManager.js';
import { getNextNDates, parseDDMMYYYY } from '../../shared/utils/dateFormatter.js';
import type { ScheduleStatus } from '../../shared/types/types.js';

const router = Router();

// Get next 14 days schedule
router.get('/next14', verifyToken, async (req: AuthRequest, res) => {
  try {
    const { getNext14DaysSchedule } = await import('../../repositories/schedule.repository.js');
    const schedules = await getNext14DaysSchedule();
    res.json({ success: true, schedules });
  } catch (error) {
    console.error('Error fetching next 14 days schedule:', error);
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
    console.error('Error fetching paginated schedules:', error);
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
    console.error('Error updating schedule reason:', error);
    logger.error('Failed to update schedule reason', error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: 'Failed to update schedule reason' });
  }
});

// Update player availability
router.post('/update-availability', verifyToken, async (req: AuthRequest, res) => {
  try {
    const { date, userId, availability } = req.body;
    
    if (!date || !userId || availability === undefined) {
      return res.status(400).json({ error: 'Date, userId, and availability are required' });
    }
    
    // Users can only edit their own availability
    if (req.user?.role === 'user') {
      const mappings = await getUserMappings();
      const userMapping = mappings.find(m => m.displayName === req.user?.username);

      if (!userMapping || userMapping.discordId !== userId) {
        logger.warn('Availability update denied', `User ${req.user?.username} tried to edit ${userId}`);
        return res.status(403).json({ error: 'You can only edit your own availability' });
      }
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
    console.error('Error updating availability:', error);
    logger.error('Failed to update availability', error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: 'Failed to update availability' });
  }
});

// Export schedule as iCal (.ics) file
router.get('/export-ical', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const ical = await import('ical-generator');
    const { getNext14DaysSchedule } = await import('../../repositories/schedule.repository.js');
    const { getAbsentUserIdsForDates } = await import('../../repositories/absence.repository.js');
    const { parseSchedule, analyzeSchedule } = await import('../../shared/utils/analyzer.js');

    const settings = loadSettings();
    const teamName = settings.branding?.teamName || 'Valorant Bot';

    const schedules = await getNext14DaysSchedule();
    const dates = schedules.map((s: any) => s.date);
    const absentByDate = await getAbsentUserIdsForDates(dates);

    const calendar = ical.default({
      name: `${teamName} Schedule`,
      prodId: { company: teamName, product: 'Schedule Bot' },
      timezone: settings.scheduling?.timezone || 'Europe/Berlin',
    });

    for (const schedule of schedules) {
      const dateStr = schedule.date;
      const reason = schedule.reason || 'Training';
      const absentUserIds = absentByDate[dateStr] || [];

      // Skip off-days
      if (reason === 'Off-Day') continue;

      const dateObj = parseDDMMYYYY(dateStr);

      // Parse schedule to get time window
      const parsed = parseSchedule(schedule, absentUserIds);
      const analysis = analyzeSchedule(parsed);

      let startHour = 18, startMin = 0;
      let endHour = 22, endMin = 0;

      if (analysis.commonTimeRange) {
        const [sH, sM] = analysis.commonTimeRange.start.split(':').map(Number);
        const [eH, eM] = analysis.commonTimeRange.end.split(':').map(Number);
        startHour = sH; startMin = sM;
        endHour = eH; endMin = eM;
      }

      const start = new Date(dateObj);
      start.setHours(startHour, startMin, 0, 0);
      const end = new Date(dateObj);
      end.setHours(endHour, endMin, 0, 0);

      const availableCount = analysis.availableMainCount + analysis.availableSubCount;
      const statusText = analysis.status === 'FULL_ROSTER' ? 'Full Roster' :
                         analysis.status === 'WITH_SUBS' ? `${availableCount} available` :
                         analysis.status === 'NOT_ENOUGH' ? 'Not enough players' : reason;

      calendar.createEvent({
        start,
        end,
        summary: `${teamName} - ${reason}`,
        description: `Status: ${statusText}\nAvailable players: ${availableCount}`,
        location: 'Discord',
      });
    }

    const icsContent = calendar.toString();
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${teamName.replace(/[^a-zA-Z0-9]/g, '_')}_schedule.ics"`);
    res.send(icsContent);
  } catch (error) {
    logger.error('Failed to generate iCal export', error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: 'Failed to generate calendar export' });
  }
});

export default router;
