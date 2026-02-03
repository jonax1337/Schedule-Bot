import { Router } from 'express';
import { verifyToken, requireAdmin, AuthRequest, resolveCurrentUser, resolveTargetUser, requireOwnershipOrAdmin } from '../../shared/middleware/auth.js';
import { sanitizeString, validate, absenceCreateSchema, absenceUpdateSchema, isValidDateFormat } from '../../shared/middleware/validation.js';
import { absenceService } from '../../services/absence.service.js';
import { logger, getErrorMessage } from '../../shared/utils/logger.js';
import { sendOk, sendError, sendServerError, sendForbidden } from '../../shared/utils/apiResponse.js';

const router = Router();

// Get absences for the logged-in user
router.get('/my', verifyToken, resolveCurrentUser, async (req: AuthRequest, res) => {
  try {
    if (!req.resolvedUser) {
      // Admin account without user mapping - return empty absences
      return sendOk(res, { absences: [] });
    }

    const absences = await absenceService.getAbsencesForUser(req.resolvedUser.discordId);
    return sendOk(res, { absences });
  } catch (error) {
    return sendServerError(res, error, 'Fetch user absences');
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
        return sendError(res, 'Invalid userId format');
      }

      // Non-admin users can only query their own absences
      if (!isAdmin && req.resolvedUser?.discordId !== userId) {
        return sendForbidden(res, 'You can only view your own absences');
      }

      const absences = await absenceService.getAbsencesForUser(userId);
      return sendOk(res, { absences });
    } else {
      // Only admins can list all absences
      if (!isAdmin) {
        return sendForbidden(res, 'Admin access required to list all absences');
      }
      const absences = await absenceService.getAllAbsences();
      return sendOk(res, { absences });
    }
  } catch (error) {
    return sendServerError(res, error, 'Fetch absences');
  }
});

// Get absent user IDs for specific dates (batch)
router.get('/by-dates', verifyToken, async (req: AuthRequest, res) => {
  try {
    const datesParam = req.query.dates as string;
    if (!datesParam) {
      return sendError(res, 'Dates parameter required');
    }

    const dates = datesParam.split(',').map(d => d.trim());

    // Validate date formats
    const invalidDates = dates.filter(d => !isValidDateFormat(d));
    if (invalidDates.length > 0) {
      return sendError(res, 'Invalid date format. Use DD.MM.YYYY');
    }

    // Limit batch size
    if (dates.length > 60) {
      return sendError(res, 'Too many dates. Maximum 60 dates per request');
    }

    const absentByDate = await absenceService.getAbsentUserIdsForDates(dates);
    return sendOk(res, { absentByDate });
  } catch (error) {
    return sendServerError(res, error, 'Fetch absences by dates');
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
      return sendError(res, result.error || 'Failed to create absence');
    }

    logger.success('Absence created', `${targetUserId}: ${startDate} - ${endDate}`);
    return sendOk(res, { absence: result.absence });
  } catch (error) {
    return sendServerError(res, error, 'Create absence');
  }
});

// Update an absence
router.put('/:id', verifyToken, validate(absenceUpdateSchema), resolveTargetUser, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      return sendError(res, 'Invalid absence ID');
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
      return sendError(res, result.error || 'Failed to update absence');
    }

    logger.success('Absence updated', `ID: ${id}`);
    return sendOk(res, { absence: result.absence });
  } catch (error) {
    return sendServerError(res, error, 'Update absence');
  }
});

// Delete an absence
router.delete('/:id', verifyToken, resolveTargetUser, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      return sendError(res, 'Invalid absence ID');
    }

    const isAdmin = req.user?.role === 'admin';
    const requestingUserId = isAdmin ? undefined : req.targetUserId;

    const result = await absenceService.deleteAbsence(id, requestingUserId, isAdmin);

    if (!result.success) {
      return sendError(res, result.error || 'Failed to delete absence');
    }

    logger.success('Absence deleted', `ID: ${id}`);
    return sendOk(res, { message: 'Absence deleted' });
  } catch (error) {
    return sendServerError(res, error, 'Delete absence');
  }
});

export default router;
