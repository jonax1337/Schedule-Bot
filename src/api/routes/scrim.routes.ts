import { Router } from 'express';
import { verifyToken, requireAdmin, optionalAuth, AuthRequest } from '../../shared/middleware/auth.js';
import { validate, addScrimSchema, updateScrimSchema, isValidDateFormat } from '../../shared/middleware/validation.js';
import { getAllScrims, addScrim, updateScrim, deleteScrim, getScrimById, getScrimStats, getScrimsByDateRange } from '../../repositories/scrim.repository.js';
import { extractMatchId, fetchTrackerData } from '../../services/tracker.service.js';
import { loadSettings } from '../../shared/utils/settingsManager.js';
import { logger } from '../../shared/utils/logger.js';

const router = Router();

// Get scrim statistics (must be before /:id route)
router.get('/stats/summary', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const stats = await getScrimStats();
    res.json({ success: true, stats });
  } catch (error) {
    logger.error('Error fetching scrim stats', error instanceof Error ? error.message : String(error));
    res.status(500).json({ success: false, error: 'Failed to fetch scrim stats' });
  }
});

// Get scrims by date range (must be before /:id route)
router.get('/range/:startDate/:endDate', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const startDate = req.params.startDate as string;
    const endDate = req.params.endDate as string;

    // Validate date format
    if (!isValidDateFormat(startDate) || !isValidDateFormat(endDate)) {
      return res.status(400).json({ success: false, error: 'Invalid date format. Use DD.MM.YYYY' });
    }

    const scrims = await getScrimsByDateRange(startDate, endDate);
    res.json({ success: true, scrims });
  } catch (error) {
    logger.error('Error fetching scrims by range', error instanceof Error ? error.message : String(error));
    res.status(500).json({ success: false, error: 'Failed to fetch scrims' });
  }
});

// Fetch tracker data from HenrikDev API (must be before /:id route)
router.post('/tracker/fetch', verifyToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { trackerUrl } = req.body;
    if (!trackerUrl) {
      return res.status(400).json({ success: false, error: 'trackerUrl is required' });
    }

    const matchId = extractMatchId(trackerUrl);
    if (!matchId) {
      return res.status(400).json({ success: false, error: 'Invalid tracker.gg URL. Expected format: https://tracker.gg/valorant/match/<match-id>' });
    }

    const settings = loadSettings();
    if (!settings.tracker.henrikApiKey) {
      return res.status(400).json({ success: false, error: 'HenrikDev API key not configured. Set it in Settings > Tracker.gg Integration.' });
    }

    const data = await fetchTrackerData(matchId, settings.tracker.henrikApiKey, settings.tracker.region);
    if (!data) {
      return res.status(502).json({ success: false, error: 'Failed to fetch match data from API. Check your API key and try again.' });
    }

    logger.success('Tracker data fetched', `Match ${matchId} by ${req.user?.username}`);
    res.json({ success: true, trackerData: data });
  } catch (error) {
    logger.error('Failed to fetch tracker data', error instanceof Error ? error.message : String(error));
    res.status(500).json({ success: false, error: 'Failed to fetch tracker data' });
  }
});

// Get all scrims
router.get('/', optionalAuth, async (req, res) => {
  try {
    const scrims = await getAllScrims();
    res.json({ success: true, scrims });
  } catch (error) {
    logger.error('Error fetching scrims', error instanceof Error ? error.message : String(error));
    res.status(500).json({ success: false, error: 'Failed to fetch scrims' });
  }
});

// Get scrim by ID (must be after specific routes)
router.get('/:id', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const scrim = await getScrimById(req.params.id as string);

    if (scrim) {
      res.json({ success: true, scrim });
    } else {
      res.status(404).json({ success: false, error: 'Scrim not found' });
    }
  } catch (error) {
    logger.error('Error fetching scrim', error instanceof Error ? error.message : String(error));
    res.status(500).json({ success: false, error: 'Failed to fetch scrim' });
  }
});

// Add scrim (admin only)
router.post('/', verifyToken, requireAdmin, validate(addScrimSchema), async (req: AuthRequest, res) => {
  try {
    const scrimData = req.body;
    const scrim = await addScrim(scrimData);

    logger.success('Scrim added', `${scrimData.opponent} by ${req.user?.username}`);
    res.json({ success: true, scrim });
  } catch (error) {
    logger.error('Failed to add scrim', error instanceof Error ? error.message : String(error));
    res.status(500).json({ success: false, error: 'Failed to add scrim' });
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
      res.json({ success: true, scrim });
    } else {
      res.status(404).json({ success: false, error: 'Scrim not found' });
    }
  } catch (error) {
    logger.error('Failed to update scrim', error instanceof Error ? error.message : String(error));
    res.status(500).json({ success: false, error: 'Failed to update scrim' });
  }
});

// Delete scrim (admin only)
router.delete('/:id', verifyToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const success = await deleteScrim(id);

    if (success) {
      logger.success('Scrim deleted', `${id} by ${req.user?.username}`);
      res.json({ success: true, message: 'Scrim deleted successfully' });
    } else {
      res.status(404).json({ success: false, error: 'Scrim not found' });
    }
  } catch (error) {
    logger.error('Failed to delete scrim', error instanceof Error ? error.message : String(error));
    res.status(500).json({ success: false, error: 'Failed to delete scrim' });
  }
});

export default router;
