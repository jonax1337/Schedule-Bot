import { Router } from 'express';
import { verifyToken, optionalAuth, AuthRequest } from '../../shared/middleware/auth.js';
import { getAllScrims, addScrim, updateScrim, deleteScrim, getScrimById, getScrimStats, getScrimsByDateRange } from '../../repositories/scrim.repository.js';
import { logger } from '../../shared/utils/logger.js';

const router = Router();

// Get scrim statistics (must be before /:id route)
router.get('/stats/summary', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const stats = await getScrimStats();
    res.json({ success: true, stats });
  } catch (error) {
    console.error('Error fetching scrim stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch scrim stats' });
  }
});

// Get scrims by date range (must be before /:id route)
router.get('/range/:startDate/:endDate', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const startDate = req.params.startDate as string;
    const endDate = req.params.endDate as string;
    const scrims = await getScrimsByDateRange(startDate, endDate);
    res.json({ success: true, scrims });
  } catch (error) {
    console.error('Error fetching scrims by range:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch scrims' });
  }
});

// Get all scrims
router.get('/', optionalAuth, async (req, res) => {
  try {
    const scrims = await getAllScrims();
    res.json({ success: true, scrims });
  } catch (error) {
    console.error('Error fetching scrims:', error);
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
    console.error('Error fetching scrim:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch scrim' });
  }
});

// Add scrim
router.post('/', verifyToken, async (req: AuthRequest, res) => {
  try {
    const scrimData = req.body;
    const scrim = await addScrim(scrimData);
    
    logger.success('Scrim added', `${scrimData.opponent} by ${req.user?.username}`);
    res.json({ success: true, scrim });
  } catch (error) {
    console.error('Error adding scrim:', error);
    logger.error('Failed to add scrim', error instanceof Error ? error.message : String(error));
    res.status(500).json({ success: false, error: 'Failed to add scrim' });
  }
});

// Update scrim
router.put('/:id', verifyToken, async (req: AuthRequest, res) => {
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
    console.error('Error updating scrim:', error);
    logger.error('Failed to update scrim', error instanceof Error ? error.message : String(error));
    res.status(500).json({ success: false, error: 'Failed to update scrim' });
  }
});

// Delete scrim
router.delete('/:id', verifyToken, async (req: AuthRequest, res) => {
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
    console.error('Error deleting scrim:', error);
    logger.error('Failed to delete scrim', error instanceof Error ? error.message : String(error));
    res.status(500).json({ success: false, error: 'Failed to delete scrim' });
  }
});

export default router;
