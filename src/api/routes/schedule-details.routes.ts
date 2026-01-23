import { Router } from 'express';
import { optionalAuth, AuthRequest } from '../../shared/middleware/auth.js';
import { getScheduleDetails, getScheduleDetailsBatch } from '../../shared/utils/scheduleDetails.js';

const router = Router();

// Get schedule details for multiple dates (batch) - must be before single route
router.get('-batch', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const datesParam = req.query.dates as string;
    if (!datesParam) {
      return res.status(400).json({ error: 'Dates parameter required' });
    }

    const dates = datesParam.split(',').map(d => d.trim());
    const details = await getScheduleDetailsBatch(dates);
    
    res.json(details);
  } catch (error) {
    console.error('Error fetching schedule details batch:', error);
    res.status(500).json({ error: 'Failed to fetch schedule details' });
  }
});

// Get schedule details for single date
router.get('/', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const date = req.query.date as string;
    if (!date) {
      return res.status(400).json({ error: 'Date parameter required' });
    }

    const details = await getScheduleDetails(date);
    
    if (!details) {
      return res.status(404).json({ error: 'Schedule details not found' });
    }
    
    res.json(details);
  } catch (error) {
    console.error('Error fetching schedule details:', error);
    res.status(500).json({ error: 'Failed to fetch schedule details' });
  }
});

export default router;
