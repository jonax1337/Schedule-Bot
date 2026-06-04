import { Router } from 'express';
import { verifyToken, requireOrgMembership,AuthRequest } from '../../shared/middleware/auth.js';
import { validate, createVodCommentSchema, updateVodCommentSchema } from '../../shared/middleware/validation.js';
import {
  getCommentsByScrimId,
  getCommentById,
  createComment,
  updateComment,
  deleteComment,
} from '../../repositories/vod-comment.repository.js';
import { logger, getErrorMessage } from '../../shared/utils/logger.js';

const router = Router();

async function assertOwnerOrAdmin(id: number, userName: string, isAdmin: boolean): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (isAdmin) return { ok: true };
  const comment = await getCommentById(id);
  if (!comment) return { ok: false, status: 404, error: 'Comment not found' };
  if (comment.userName !== userName) return { ok: false, status: 403, error: 'You can only modify your own comments' };
  return { ok: true };
}

// Get all comments for a scrim
router.get('/scrim/:scrimId', async (req, res) => {
  try {
    const comments = await getCommentsByScrimId(req.params.scrimId as string);
    res.json({ success: true, comments });
  } catch (error) {
    logger.error('Error fetching VOD comments', getErrorMessage(error));
    res.status(500).json({ success: false, error: 'Failed to fetch comments' });
  }
});

// Create a comment
router.post('/', verifyToken, requireOrgMembership,validate(createVodCommentSchema), async (req: AuthRequest, res) => {
  try {
    const { scrimId, timestamp, content } = req.body;
    const userName = req.user!.username;
    const comment = await createComment(scrimId, userName, timestamp, content);
    logger.info('VOD comment created', `Scrim ${scrimId} by ${userName}`);
    res.json({ success: true, comment });
  } catch (error) {
    logger.error('Failed to create VOD comment', getErrorMessage(error));
    res.status(500).json({ success: false, error: 'Failed to create comment' });
  }
});

// Update a comment (owner or admin)
router.put('/:id', verifyToken, requireOrgMembership,validate(updateVodCommentSchema), async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const userName = req.user!.username;
    const isAdmin = req.user!.role === 'admin';

    const check = await assertOwnerOrAdmin(id, userName, isAdmin);
    if (!check.ok) return res.status(check.status).json({ success: false, error: check.error });

    const comment = await updateComment(id, req.body);
    if (comment) {
      res.json({ success: true, comment });
    } else {
      res.status(404).json({ success: false, error: 'Comment not found' });
    }
  } catch (error) {
    logger.error('Failed to update VOD comment', getErrorMessage(error));
    res.status(500).json({ success: false, error: 'Failed to update comment' });
  }
});

// Delete a comment (owner or admin)
router.delete('/:id', verifyToken, requireOrgMembership,async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const userName = req.user!.username;
    const isAdmin = req.user!.role === 'admin';

    const check = await assertOwnerOrAdmin(id, userName, isAdmin);
    if (!check.ok) return res.status(check.status).json({ success: false, error: check.error });

    const success = await deleteComment(id);
    if (success) {
      logger.info('VOD comment deleted', `ID ${id} by ${userName}`);
      res.json({ success: true });
    } else {
      res.status(404).json({ success: false, error: 'Comment not found' });
    }
  } catch (error) {
    logger.error('Failed to delete VOD comment', getErrorMessage(error));
    res.status(500).json({ success: false, error: 'Failed to delete comment' });
  }
});

export default router;
