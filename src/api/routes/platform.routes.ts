import { Router } from 'express';
import { verifyToken, AuthRequest } from '../../shared/middleware/auth.js';
import { getAccountOrganizations } from '../../repositories/organization.repository.js';
import { logger, getErrorMessage } from '../../shared/utils/logger.js';

/**
 * Control-plane routes (account-scoped, NOT tenant-scoped).
 */
const router = Router();

/** Orgs the authenticated account may access — powers the org switcher. */
router.get('/orgs', verifyToken, async (req: AuthRequest, res) => {
  try {
    const accountId = req.user?.accountId;
    if (!accountId) {
      return res.json({ success: true, organizations: [] });
    }
    const organizations = await getAccountOrganizations(accountId);
    res.json({ success: true, organizations });
  } catch (error) {
    logger.error('Failed to list account organizations', getErrorMessage(error));
    res.status(500).json({ error: 'Failed to list organizations' });
  }
});

export default router;
