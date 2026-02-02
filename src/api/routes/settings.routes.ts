import { Router } from 'express';
import { verifyToken, requireAdmin, AuthRequest } from '../../shared/middleware/auth.js';
import { validate, settingsSchema } from '../../shared/middleware/validation.js';
import { strictApiLimiter } from '../../shared/middleware/rateLimiter.js';
import { reloadConfig } from '../../shared/config/config.js';
import { saveSettings, loadSettingsAsync } from '../../shared/utils/settingsManager.js';
import { restartScheduler } from '../../jobs/scheduler.js';
import { logger, getErrorMessage } from '../../shared/utils/logger.js';

const router = Router();

// Get settings
router.get('/', async (req, res) => {
  try {
    const settings = await loadSettingsAsync();
    res.json(settings);
  } catch (error) {
    logger.error('Failed to load settings', getErrorMessage(error));
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Update settings
router.post('/', verifyToken, requireAdmin, strictApiLimiter, validate(settingsSchema), async (req: AuthRequest, res) => {
  try {
    const settings = req.body;
    
    await saveSettings(settings);
    await reloadConfig();
    restartScheduler();
    
    logger.success('Settings updated', `By: ${req.user?.username}`);
    res.json({ success: true, message: 'Settings updated successfully' });
  } catch (error) {
    logger.error('Failed to update settings', getErrorMessage(error));
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Reload config
router.post('/reload-config', verifyToken, requireAdmin, strictApiLimiter, async (req: AuthRequest, res) => {
  try {
    await reloadConfig();
    restartScheduler();
    
    logger.success('Config reloaded', `By: ${req.user?.username}`);
    res.json({ success: true, message: 'Configuration reloaded successfully' });
  } catch (error) {
    logger.error('Failed to reload config', getErrorMessage(error));
    res.status(500).json({ error: 'Failed to reload configuration' });
  }
});

export default router;
