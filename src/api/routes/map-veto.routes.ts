import { Router } from 'express';
import { verifyToken, requireAdmin, AuthRequest } from '../../shared/middleware/auth.js';
import { sanitizeString } from '../../shared/middleware/validation.js';
import { logger } from '../../shared/utils/logger.js';

const router = Router();

// Get all map veto sessions
router.get('/', verifyToken, async (req: AuthRequest, res) => {
  try {
    const { getAllMapVetoSessions } = await import('../../repositories/map-veto.repository.js');
    const sessions = await getAllMapVetoSessions();
    res.json({ success: true, sessions });
  } catch (error) {
    logger.error('Failed to fetch map veto sessions', error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: 'Failed to fetch map veto sessions' });
  }
});

// Get single map veto session
router.get('/:id', verifyToken, async (req: AuthRequest, res) => {
  try {
    const { getMapVetoSession } = await import('../../repositories/map-veto.repository.js');
    const session = await getMapVetoSession(req.params.id as string);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.json({ success: true, session });
  } catch (error) {
    logger.error('Failed to fetch map veto session', error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: 'Failed to fetch map veto session' });
  }
});

// Create map veto session
router.post('/', verifyToken, async (req: AuthRequest, res) => {
  try {
    const { createMapVetoSession } = await import('../../repositories/map-veto.repository.js');
    const { title, opponent, date, notes, entries } = req.body;

    if (!title || !entries || !Array.isArray(entries)) {
      return res.status(400).json({ error: 'Title and entries array are required' });
    }

    // Validate entries
    for (const entry of entries) {
      if (!entry.step || !entry.action || !entry.map || !entry.team) {
        return res.status(400).json({ error: 'Each entry requires step, action, map, and team' });
      }
      if (!['BAN', 'PICK', 'DECIDER'].includes(entry.action)) {
        return res.status(400).json({ error: 'Action must be BAN, PICK, or DECIDER' });
      }
      if (!['OUR_TEAM', 'OPPONENT'].includes(entry.team)) {
        return res.status(400).json({ error: 'Team must be OUR_TEAM or OPPONENT' });
      }
    }

    const id = `veto_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const createdBy = req.user?.username || 'unknown';

    const session = await createMapVetoSession({
      id,
      title: sanitizeString(title),
      opponent: sanitizeString(opponent || ''),
      date: sanitizeString(date || ''),
      notes: sanitizeString(notes || ''),
      createdBy,
      entries: entries.map((e: any, i: number) => ({
        step: e.step || i + 1,
        action: e.action,
        map: sanitizeString(e.map),
        team: e.team,
      })),
    });

    res.json({ success: true, session });
  } catch (error) {
    logger.error('Failed to create map veto session', error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: 'Failed to create map veto session' });
  }
});

// Update map veto session
router.put('/:id', verifyToken, async (req: AuthRequest, res) => {
  try {
    const { updateMapVetoSession } = await import('../../repositories/map-veto.repository.js');
    const { title, opponent, date, notes, entries } = req.body;

    const updateData: any = {};
    if (title !== undefined) updateData.title = sanitizeString(title);
    if (opponent !== undefined) updateData.opponent = sanitizeString(opponent);
    if (date !== undefined) updateData.date = sanitizeString(date);
    if (notes !== undefined) updateData.notes = sanitizeString(notes);

    if (entries && Array.isArray(entries)) {
      for (const entry of entries) {
        if (!entry.action || !entry.map || !entry.team) {
          return res.status(400).json({ error: 'Each entry requires action, map, and team' });
        }
      }
      updateData.entries = entries.map((e: any, i: number) => ({
        step: e.step || i + 1,
        action: e.action,
        map: sanitizeString(e.map),
        team: e.team,
      }));
    }

    const session = await updateMapVetoSession(req.params.id as string, updateData);
    res.json({ success: true, session });
  } catch (error) {
    logger.error('Failed to update map veto session', error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: 'Failed to update map veto session' });
  }
});

// Delete map veto session
router.delete('/:id', verifyToken, async (req: AuthRequest, res) => {
  try {
    const { deleteMapVetoSession } = await import('../../repositories/map-veto.repository.js');
    await deleteMapVetoSession(req.params.id as string);
    res.json({ success: true, message: 'Session deleted' });
  } catch (error) {
    logger.error('Failed to delete map veto session', error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: 'Failed to delete map veto session' });
  }
});

export default router;
