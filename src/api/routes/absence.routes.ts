import { Router } from 'express';
import { verifyToken, requireOrgMembership,AuthRequest, resolveCurrentUser, resolveTargetUser } from '../../shared/middleware/auth.js';
import { sanitizeString, validate, absenceCreateSchema, absenceUpdateSchema, isValidDateFormat } from '../../shared/middleware/validation.js';
import {
  getAbsencesForUser,
  getAllAbsences,
  getAbsenceById,
  createAbsence,
  updateAbsence,
  deleteAbsence,
  getAbsentUserIdsForDates,
} from '../../repositories/absence.repository.js';
import { parseDDMMYYYY } from '../../shared/utils/dateFormatter.js';
import { logger, getErrorMessage } from '../../shared/utils/logger.js';

const router = Router();

// Get absences for the logged-in user
router.get('/my', verifyToken, requireOrgMembership,resolveCurrentUser, async (req: AuthRequest, res) => {
  try {
    if (!req.resolvedUser) {
      // Admin account without user mapping - return empty absences
      return res.json({ success: true, absences: [] });
    }

    const absences = await getAbsencesForUser(req.resolvedUser.discordId);
    res.json({ success: true, absences });
  } catch (error) {
    logger.error('Error fetching user absences', getErrorMessage(error));
    res.status(500).json({ error: 'Failed to fetch absences' });
  }
});

// Get all absences (admin only) or absences for a specific user
router.get('/', verifyToken, requireOrgMembership,resolveCurrentUser, async (req: AuthRequest, res) => {
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

      const absences = await getAbsencesForUser(userId);
      res.json({ success: true, absences });
    } else {
      // Only admins can list all absences
      if (!isAdmin) {
        return res.status(403).json({ error: 'Admin access required to list all absences' });
      }
      const absences = await getAllAbsences();
      res.json({ success: true, absences });
    }
  } catch (error) {
    logger.error('Error fetching absences', getErrorMessage(error));
    res.status(500).json({ error: 'Failed to fetch absences' });
  }
});

// Get absent user IDs for specific dates (batch)
router.get('/by-dates', verifyToken, requireOrgMembership,async (req: AuthRequest, res) => {
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

    const absentByDate = await getAbsentUserIdsForDates(dates);
    res.json({ success: true, absentByDate });
  } catch (error) {
    logger.error('Error fetching absences by dates', getErrorMessage(error));
    res.status(500).json({ error: 'Failed to fetch absences' });
  }
});

// Create an absence
router.post('/', verifyToken, requireOrgMembership,validate(absenceCreateSchema), resolveTargetUser, async (req: AuthRequest, res) => {
  try {
    const { startDate, endDate, reason } = req.body;
    const targetUserId = req.targetUserId!;

    if (parseDDMMYYYY(startDate) > parseDDMMYYYY(endDate)) {
      return res.status(400).json({ error: 'Start date must be before or equal to end date' });
    }

    const absence = await createAbsence(targetUserId, startDate, endDate, sanitizeString(reason || ''));

    logger.success('Absence created', `${targetUserId}: ${startDate} - ${endDate}`);
    res.json({ success: true, absence });
  } catch (error) {
    logger.error('Failed to create absence', getErrorMessage(error));
    res.status(500).json({ error: 'Failed to create absence' });
  }
});

// Update an absence
router.put('/:id', verifyToken, requireOrgMembership,validate(absenceUpdateSchema), resolveTargetUser, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid absence ID' });
    }

    const isAdmin = req.user?.role === 'admin';

    const existing = await getAbsenceById(id);
    if (!existing) {
      return res.status(400).json({ error: 'Absence not found' });
    }
    if (!isAdmin && existing.userId !== req.targetUserId) {
      return res.status(400).json({ error: 'You can only edit your own absences' });
    }

    const { startDate, endDate, reason } = req.body;
    const updateData: { startDate?: string; endDate?: string; reason?: string } = {};
    if (startDate) updateData.startDate = startDate;
    if (endDate) updateData.endDate = endDate;
    if (reason !== undefined) updateData.reason = sanitizeString(reason);

    const newStart = updateData.startDate || existing.startDate;
    const newEnd = updateData.endDate || existing.endDate;
    if (parseDDMMYYYY(newStart) > parseDDMMYYYY(newEnd)) {
      return res.status(400).json({ error: 'Start date must be before or equal to end date' });
    }

    const absence = await updateAbsence(id, updateData);
    if (!absence) {
      return res.status(400).json({ error: 'Failed to update absence' });
    }

    logger.success('Absence updated', `ID: ${id}`);
    res.json({ success: true, absence });
  } catch (error) {
    logger.error('Error updating absence', getErrorMessage(error));
    res.status(500).json({ error: 'Failed to update absence' });
  }
});

// Delete an absence
router.delete('/:id', verifyToken, requireOrgMembership,resolveTargetUser, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid absence ID' });
    }

    const isAdmin = req.user?.role === 'admin';

    const existing = await getAbsenceById(id);
    if (!existing) {
      return res.status(400).json({ error: 'Absence not found' });
    }
    if (!isAdmin && existing.userId !== req.targetUserId) {
      return res.status(400).json({ error: 'You can only delete your own absences' });
    }

    const success = await deleteAbsence(id);
    if (!success) {
      return res.status(400).json({ error: 'Failed to delete absence' });
    }

    logger.success('Absence deleted', `ID: ${id}`);
    res.json({ success: true, message: 'Absence deleted' });
  } catch (error) {
    logger.error('Error deleting absence', getErrorMessage(error));
    res.status(500).json({ error: 'Failed to delete absence' });
  }
});

export default router;
