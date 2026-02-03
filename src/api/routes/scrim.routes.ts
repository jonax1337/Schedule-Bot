import { Router } from 'express';
import { verifyToken, requireAdmin, optionalAuth, AuthRequest } from '../../shared/middleware/auth.js';
import { validate, addScrimSchema, updateScrimSchema, isValidDateFormat } from '../../shared/middleware/validation.js';
import { getAllScrims, addScrim, updateScrim, deleteScrim, getScrimById, getScrimStats, getScrimsByDateRange } from '../../repositories/scrim.repository.js';
import { logger } from '../../shared/utils/logger.js';
import { sendOk, sendError, sendServerError, sendNotFound } from '../../shared/utils/apiResponse.js';

const router = Router();

// Get scrim statistics (must be before /:id route)
router.get('/stats/summary', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const stats = await getScrimStats();
    return sendOk(res, { stats });
  } catch (error) {
    return sendServerError(res, error, 'Fetch scrim stats');
  }
});

// Get scrims by date range (must be before /:id route)
router.get('/range/:startDate/:endDate', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const startDate = req.params.startDate as string;
    const endDate = req.params.endDate as string;

    // Validate date format
    if (!isValidDateFormat(startDate) || !isValidDateFormat(endDate)) {
      return sendError(res, 'Invalid date format. Use DD.MM.YYYY');
    }

    const scrims = await getScrimsByDateRange(startDate, endDate);
    return sendOk(res, { scrims });
  } catch (error) {
    return sendServerError(res, error, 'Fetch scrims by range');
  }
});

// Get all scrims
router.get('/', optionalAuth, async (req, res) => {
  try {
    const scrims = await getAllScrims();
    return sendOk(res, { scrims });
  } catch (error) {
    return sendServerError(res, error, 'Fetch scrims');
  }
});

// Get scrim by ID (must be after specific routes)
router.get('/:id', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const scrim = await getScrimById(req.params.id as string);

    if (scrim) {
      return sendOk(res, { scrim });
    } else {
      return sendNotFound(res, 'Scrim');
    }
  } catch (error) {
    return sendServerError(res, error, 'Fetch scrim');
  }
});

// Add scrim (admin only)
router.post('/', verifyToken, requireAdmin, validate(addScrimSchema), async (req: AuthRequest, res) => {
  try {
    const scrimData = req.body;
    const scrim = await addScrim(scrimData);

    logger.success('Scrim added', `${scrimData.opponent} by ${req.user?.username}`);
    return sendOk(res, { scrim });
  } catch (error) {
    return sendServerError(res, error, 'Add scrim');
  }
});

// Update scrim (admin only)
router.put('/:id', verifyToken, requireAdmin, validate(updateScrimSchema), async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const updates = req.body;

    const scrim = await updateScrim(id, updates);

    if (scrim) {
      logger.success('Scrim updated', `${id} by ${req.user?.username}`);
      return sendOk(res, { scrim });
    } else {
      return sendNotFound(res, 'Scrim');
    }
  } catch (error) {
    return sendServerError(res, error, 'Update scrim');
  }
});

// Delete scrim (admin only)
router.delete('/:id', verifyToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const success = await deleteScrim(id);

    if (success) {
      logger.success('Scrim deleted', `${id} by ${req.user?.username}`);
      return sendOk(res, { message: 'Scrim deleted successfully' });
    } else {
      return sendNotFound(res, 'Scrim');
    }
  } catch (error) {
    return sendServerError(res, error, 'Delete scrim');
  }
});

export default router;
