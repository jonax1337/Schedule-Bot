import { Router } from 'express';
import { verifyToken, requireOrgAdmin, requireOrgMembership, AuthRequest } from '../../shared/middleware/auth.js';
import type { TenantRequest } from '../../shared/middleware/tenant.js';
import { validate, settingsSchema } from '../../shared/middleware/validation.js';
import { strictApiLimiter } from '../../shared/middleware/rateLimiter.js';
import { reloadConfig } from '../../shared/config/config.js';
import { getSettingsForCurrentOrg, saveSettingsForCurrentOrg } from '../../shared/utils/settingsManager.js';
import { setOrgChannel } from '../../repositories/organization.repository.js';
import { restartScheduler } from '../../jobs/scheduler.js';
import { logger, getErrorMessage } from '../../shared/utils/logger.js';

const router = Router();

// The org the bot/scheduler runtime config singleton reflects (PoC).
const DEFAULT_ORG_SLUG = process.env.POC_DEFAULT_ORG_SLUG || 'default';

// Get settings (public: the login page reads e.g. allowDiscordAuth). Scoped to
// the tenant resolved from the subdomain/header.
router.get('/', async (req, res) => {
  try {
    const settings = await getSettingsForCurrentOrg();
    res.json(settings);
  } catch (error) {
    logger.error('Failed to load settings', getErrorMessage(error));
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Update settings — per tenant; only a member admin of the org may change them.
router.post('/', verifyToken, requireOrgMembership, requireOrgAdmin, strictApiLimiter, validate(settingsSchema), async (req: AuthRequest, res) => {
  try {
    await saveSettingsForCurrentOrg(req.body);

    // Mirror the posting channel onto the org so the bot can resolve channel→org
    // when several teams share one guild (Main/Academy).
    const tenant = (req as TenantRequest).org;
    if (tenant) await setOrgChannel(tenant.id, req.body?.discord?.channelId ?? null);

    // Warm the saved org's runtime config (context = this request's org).
    await reloadConfig();
    // The scheduler is still the bot's single (default-org) tick until per-org
    // scheduling lands; only restart it when the default org changed.
    if ((req as TenantRequest).org?.slug === DEFAULT_ORG_SLUG) {
      restartScheduler();
    }

    logger.success('Settings updated', `By: ${req.user?.username} (${(req as TenantRequest).org?.slug})`);
    res.json({ success: true, message: 'Settings updated successfully' });
  } catch (error) {
    logger.error('Failed to update settings', getErrorMessage(error));
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Reload config (default/bot org runtime)
router.post('/reload-config', verifyToken, requireOrgMembership, requireOrgAdmin, strictApiLimiter, async (req: AuthRequest, res) => {
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
