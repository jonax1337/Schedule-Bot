import { Router } from 'express';
import { client } from '../../bot/client.js';
import { optionalAuth, verifyToken, requireAdmin, AuthRequest } from '../../shared/middleware/auth.js';
import { isValidDateFormat } from '../../shared/middleware/validation.js';
import { getScheduleDetails, getScheduleDetailsBatch } from '../../shared/utils/scheduleDetails.js';
import { logger } from '../../shared/utils/logger.js';
import authRoutes from './auth.routes.js';
import scheduleRoutes from './schedule.routes.js';
import userMappingRoutes from './user-mapping.routes.js';
import scrimRoutes from './scrim.routes.js';
import discordRoutes from './discord.routes.js';
import settingsRoutes from './settings.routes.js';
import actionsRoutes from './actions.routes.js';
import adminRoutes from './admin.routes.js';
import absenceRoutes from './absence.routes.js';
import mapVetoRoutes from './map-veto.routes.js';

const router = Router();

// Mount all route modules
router.use('/', authRoutes);
router.use('/schedule', scheduleRoutes);
router.use('/user-mappings', userMappingRoutes);
router.use('/scrims', scrimRoutes);
router.use('/discord', discordRoutes);
router.use('/settings', settingsRoutes);
router.use('/actions', actionsRoutes);
router.use('/admin', adminRoutes);
router.use('/absences', absenceRoutes);
router.use('/map-veto', mapVetoRoutes);

// Schedule details routes (defined directly to avoid path issues)
router.get('/schedule-details-batch', optionalAuth, async (req: AuthRequest, res) => {
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

    const details = await getScheduleDetailsBatch(dates);

    res.json(details);
  } catch (error) {
    logger.error('Error fetching schedule details batch', error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: 'Failed to fetch schedule details' });
  }
});

router.get('/schedule-details', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const date = req.query.date as string;
    if (!date) {
      return res.status(400).json({ error: 'Date parameter required' });
    }

    // Validate date format
    if (!isValidDateFormat(date)) {
      return res.status(400).json({ error: 'Invalid date format. Use DD.MM.YYYY' });
    }

    const details = await getScheduleDetails(date);

    if (!details) {
      return res.status(404).json({ error: 'Schedule details not found' });
    }

    res.json(details);
  } catch (error) {
    logger.error('Error fetching schedule details', error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: 'Failed to fetch schedule details' });
  }
});

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'running',
    botReady: client.isReady(),
    uptime: process.uptime()
  });
});

// Bot status
router.get('/bot-status', (req, res) => {
  res.json({
    status: client.isReady() ? 'running' : 'offline',
    botReady: client.isReady(),
    uptime: process.uptime()
  });
});

// Get bot logs (protected, admin only)
router.get('/logs', verifyToken, requireAdmin, (req: AuthRequest, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 100, 1), 1000);
    const level = req.query.level as 'info' | 'warn' | 'error' | 'success' | undefined;

    const logs = logger.getLogs(limit, level);
    res.json(logs);
  } catch (error) {
    logger.error('Error fetching logs', error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

export default router;
