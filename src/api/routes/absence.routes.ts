import { Router } from 'express';
import { verifyToken, requireAdmin, AuthRequest, resolveCurrentUser, resolveTargetUser, requireOwnershipOrAdmin } from '../../shared/middleware/auth.js';
import { sanitizeString, validate, absenceCreateSchema, absenceUpdateSchema, isValidDateFormat } from '../../shared/middleware/validation.js';
import { absenceService } from '../../services/absence.service.js';
import { logger, getErrorMessage } from '../../shared/utils/logger.js';

const router = Router();

// Get absences for the logged-in user
router.get('/my', verifyToken, resolveCurrentUser, async (req: AuthRequest, res) => {
  try {
    if (!req.resolvedUser) {
      // Admin account without user mapping - return empty absences
      return res.json({ success: true, absences: [] });
    }

    const absences = await absenceService.getAbsencesForUser(req.resolvedUser.discordId);
    res.json({ success: true, absences });
  } catch (error) {
    logger.error('Error fetching user absences', getErrorMessage(error));
    res.status(500).json({ error: 'Failed to fetch absences' });
  }
});

// Get all absences (admin only) or absences for a specific user
router.get('/', verifyToken, resolveCurrentUser, async (req: AuthRequest, res) => {
  try {
    const userId = req.query.userId as string;
    const isAdmin = req.user?.role === 'admin';

    if (userId) {
      // Validate userId format
      if (!/^\d{17,19}$/.test(userId)) {
        return res.status(400).json({ error: 'Invalid userId format' });
      }

      // Non-admin users can only query their own absences
      if (!isAdmin && req.resolvedUser?.discordId !== userId) {
        return res.status(403).json({ error: 'You can only view your own absences' });
      }

      const absences = await absenceService.getAbsencesForUser(userId);
      res.json({ success: true, absences });
    } else {
      // Only admins can list all absences
      if (!isAdmin) {
        return res.status(403).json({ error: 'Admin access required to list all absences' });
      }
      const absences = await absenceService.getAllAbsences();
      res.json({ success: true, absences });
    }
  } catch (error) {
    logger.error('Error fetching absences', getErrorMessage(error));
    res.status(500).json({ error: 'Failed to fetch absences' });
  }
});

// Get absent user IDs for specific dates (batch)
router.get('/by-dates', verifyToken, async (req: AuthRequest, res) => {
  try {
    const datesParam = req.query.dates as string;
    if (!datesParam) {
      return res.status(400).json({ error: 'Dates parameter required' });
    }

    const dates = datesParam.split(',').map(d => d.trim());

    // Validate date formats
    const invalidDates = dates.filter(d => !isValidDateFormat(d));
    if (invalidDates.length > 0) {
      return res.status(400).json({ error: 'Invalid date format. Use DD.MM.YYYY' });
    }

    // Limit batch size
    if (dates.length > 60) {
      return res.status(400).json({ error: 'Too many dates. Maximum 60 dates per request' });
    }

    const absentByDate = await absenceService.getAbsentUserIdsForDates(dates);
    res.json({ success: true, absentByDate });
  } catch (error) {
    logger.error('Error fetching absences by dates', getErrorMessage(error));
    res.status(500).json({ error: 'Failed to fetch absences' });
  }
});

// Create an absence
router.post('/', verifyToken, validate(absenceCreateSchema), resolveTargetUser, async (req: AuthRequest, res) => {
  try {
    const { startDate, endDate, reason } = req.body;
    const isAdmin = req.user?.role === 'admin';
    const targetUserId = req.targetUserId!;

    const sanitizedReason = sanitizeString(reason || '');

    const result = await absenceService.createAbsence(
      targetUserId,
      startDate,
      endDate,
      sanitizedReason,
      targetUserId,
      isAdmin
    );

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    logger.success('Absence created', `${targetUserId}: ${startDate} - ${endDate}`);
    res.json({ success: true, absence: result.absence });
  } catch (error) {
    logger.error('Failed to create absence', getErrorMessage(error));
    res.status(500).json({ error: 'Failed to create absence' });
  }
});

// Update an absence
router.put('/:id', verifyToken, validate(absenceUpdateSchema), resolveTargetUser, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid absence ID' });
    }

    const { startDate, endDate, reason } = req.body;
    const isAdmin = req.user?.role === 'admin';
    const requestingUserId = isAdmin ? undefined : req.targetUserId;

    const updateData: { startDate?: string; endDate?: string; reason?: string } = {};
    if (startDate) updateData.startDate = startDate;
    if (endDate) updateData.endDate = endDate;
    if (reason !== undefined) updateData.reason = sanitizeString(reason);

    const result = await absenceService.updateAbsence(id, updateData, requestingUserId, isAdmin);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    logger.success('Absence updated', `ID: ${id}`);
    res.json({ success: true, absence: result.absence });
  } catch (error) {
    logger.error('Error updating absence', getErrorMessage(error));
    res.status(500).json({ error: 'Failed to update absence' });
  }
});

// Delete an absence
router.delete('/:id', verifyToken, resolveTargetUser, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid absence ID' });
    }

    const isAdmin = req.user?.role === 'admin';
    const requestingUserId = isAdmin ? undefined : req.targetUserId;

    const result = await absenceService.deleteAbsence(id, requestingUserId, isAdmin);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    logger.success('Absence deleted', `ID: ${id}`);
    res.json({ success: true, message: 'Absence deleted' });
  } catch (error) {
    logger.error('Error deleting absence', getErrorMessage(error));
    res.status(500).json({ error: 'Failed to delete absence' });
  }
});

export default router;
