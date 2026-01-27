import { Router } from 'express';
import { verifyToken, requireAdmin, AuthRequest } from '../../shared/middleware/auth.js';
import { sanitizeString, validate, absenceCreateSchema, absenceUpdateSchema, isValidDateFormat } from '../../shared/middleware/validation.js';
import { absenceService } from '../../services/absence.service.js';
import { getUserMappings } from '../../repositories/user-mapping.repository.js';
import { logger } from '../../shared/utils/logger.js';

const router = Router();

// Get absences for the logged-in user
router.get('/my', verifyToken, async (req: AuthRequest, res) => {
  try {
    const mappings = await getUserMappings();
    const userMapping = mappings.find(m => m.displayName === req.user?.username);

    if (!userMapping) {
      // User not in roster (e.g. admin account) - return empty absences
      return res.json({ success: true, absences: [] });
    }

    const absences = await absenceService.getAbsencesForUser(userMapping.discordId);
    res.json({ success: true, absences });
  } catch (error) {
    logger.error('Error fetching user absences', error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: 'Failed to fetch absences' });
  }
});

// Get all absences (admin only) or absences for a specific user
router.get('/', verifyToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.query.userId as string;
    const isAdmin = req.user?.role === 'admin';

    if (userId) {
      // Validate userId format
      if (!/^\d{17,19}$/.test(userId)) {
        return res.status(400).json({ error: 'Invalid userId format' });
      }

      // Non-admin users can only query their own absences
      if (!isAdmin) {
        const mappings = await getUserMappings();
        const userMapping = mappings.find(m => m.displayName === req.user?.username);
        if (!userMapping || userMapping.discordId !== userId) {
          return res.status(403).json({ error: 'You can only view your own absences' });
        }
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
    logger.error('Error fetching absences', error instanceof Error ? error.message : String(error));
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
    logger.error('Error fetching absences by dates', error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: 'Failed to fetch absences' });
  }
});

// Create an absence
router.post('/', verifyToken, validate(absenceCreateSchema), async (req: AuthRequest, res) => {
  try {
    const { userId, startDate, endDate, reason } = req.body;

    // Determine the target userId
    let targetUserId = userId;
    const isAdmin = req.user?.role === 'admin';

    if (!isAdmin || !userId) {
      // For non-admins, always use their own userId
      const mappings = await getUserMappings();
      const userMapping = mappings.find(m => m.displayName === req.user?.username);
      if (!userMapping) {
        return res.status(404).json({ error: 'User mapping not found' });
      }
      targetUserId = userMapping.discordId;
    }

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
    logger.error('Failed to create absence', error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: 'Failed to create absence' });
  }
});

// Update an absence
router.put('/:id', verifyToken, validate(absenceUpdateSchema), async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid absence ID' });
    }

    const { startDate, endDate, reason } = req.body;
    const isAdmin = req.user?.role === 'admin';

    // Determine requesting userId
    let requestingUserId: string | undefined;
    if (!isAdmin) {
      const mappings = await getUserMappings();
      const userMapping = mappings.find(m => m.displayName === req.user?.username);
      if (!userMapping) {
        return res.status(404).json({ error: 'User mapping not found' });
      }
      requestingUserId = userMapping.discordId;
    }

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
    logger.error('Error updating absence', error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: 'Failed to update absence' });
  }
});

// Delete an absence
router.delete('/:id', verifyToken, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid absence ID' });
    }

    const isAdmin = req.user?.role === 'admin';

    let requestingUserId: string | undefined;
    if (!isAdmin) {
      const mappings = await getUserMappings();
      const userMapping = mappings.find(m => m.displayName === req.user?.username);
      if (!userMapping) {
        return res.status(404).json({ error: 'User mapping not found' });
      }
      requestingUserId = userMapping.discordId;
    }

    const result = await absenceService.deleteAbsence(id, requestingUserId, isAdmin);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    logger.success('Absence deleted', `ID: ${id}`);
    res.json({ success: true, message: 'Absence deleted' });
  } catch (error) {
    logger.error('Error deleting absence', error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: 'Failed to delete absence' });
  }
});

export default router;
