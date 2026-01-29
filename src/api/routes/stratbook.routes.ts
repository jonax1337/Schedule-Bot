import { Router } from 'express';
import { optionalAuth, AuthRequest } from '../../shared/middleware/auth.js';
import { getStrats, getStratContent, isNotionConfigured } from '../../services/stratbook.service.js';
import { logger } from '../../shared/utils/logger.js';

const router = Router();

// GET /api/stratbook - List all strats (optional filter by map/side)
router.get('/', optionalAuth, async (req: AuthRequest, res) => {
  try {
    if (!isNotionConfigured()) {
      return res.json({ success: true, strats: [], configured: false });
    }

    const map = req.query.map as string | undefined;
    const side = req.query.side as string | undefined;

    const strats = await getStrats({ map, side });
    res.json({ success: true, strats, configured: true });
  } catch (error) {
    logger.error('Error fetching stratbook', error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: 'Failed to fetch stratbook' });
  }
});

// GET /api/stratbook/:pageId - Get single strat content (blocks)
router.get('/:pageId', optionalAuth, async (req: AuthRequest, res) => {
  try {
    if (!isNotionConfigured()) {
      return res.status(404).json({ error: 'Stratbook not configured' });
    }

    const pageId = req.params.pageId as string;
    const content = await getStratContent(pageId);
    res.json({ success: true, ...content });
  } catch (error) {
    logger.error('Error fetching strat content', error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: 'Failed to fetch strat content' });
  }
});

export default router;
