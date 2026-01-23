import { Router } from 'express';
import authRoutes from './auth.routes.js';
import scheduleRoutes from './schedule.routes.js';
import userMappingRoutes from './user-mapping.routes.js';
import scrimRoutes from './scrim.routes.js';
import discordRoutes from './discord.routes.js';
import settingsRoutes from './settings.routes.js';
import actionsRoutes from './actions.routes.js';

const router = Router();

// Mount all route modules
router.use('/auth', authRoutes);
router.use('/schedule', scheduleRoutes);
router.use('/user-mappings', userMappingRoutes);
router.use('/scrims', scrimRoutes);
router.use('/discord', discordRoutes);
router.use('/settings', settingsRoutes);
router.use('/actions', actionsRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({ 
    status: 'running',
    uptime: process.uptime()
  });
});

router.get('/bot-status', (req, res) => {
  res.json({ 
    status: 'running',
    uptime: process.uptime()
  });
});

export default router;
