import { Router } from 'express';
import { client } from '../../bot/client.js';
import authRoutes from './auth.routes.js';
import scheduleRoutes from './schedule.routes.js';
import userMappingRoutes from './user-mapping.routes.js';
import scrimRoutes from './scrim.routes.js';
import discordRoutes from './discord.routes.js';
import settingsRoutes from './settings.routes.js';
import actionsRoutes from './actions.routes.js';

const router = Router();

// Mount all route modules
router.use('/', authRoutes);
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

export default router;
