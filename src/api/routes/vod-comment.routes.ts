import { Router } from 'express';
import { verifyToken, AuthRequest } from '../../shared/middleware/auth.js';
import { validate, createVodCommentSchema, updateVodCommentSchema } from '../../shared/middleware/validation.js';
import { vodCommentService } from '../../services/vod-comment.service.js';
import { logger, getErrorMessage } from '../../shared/utils/logger.js';

const router = Router();

// Get all comments for a scrim
router.get('/scrim/:scrimId', async (req, res) => {
  try {
    const comments = await vodCommentService.getCommentsByScrimId(req.params.scrimId as string);
    res.json({ success: true, comments });
  } catch (error) {
    logger.error('Error fetching VOD comments', getErrorMessage(error));
    res.status(500).json({ success: false, error: 'Failed to fetch comments' });
  }
});

// Create a comment
router.post('/', verifyToken, validate(createVodCommentSchema), async (req: AuthRequest, res) => {
  try {
    const { scrimId, timestamp, content } = req.body;
    const userName = req.user!.username;
    const comment = await vodCommentService.createComment(scrimId, userName, timestamp, content);
    logger.info('VOD comment created', `Scrim ${scrimId} by ${userName}`);
    res.json({ success: true, comment });
  } catch (error) {
    logger.error('Failed to create VOD comment', getErrorMessage(error));
    res.status(500).json({ success: false, error: 'Failed to create comment' });
  }
});

// Update a comment (owner or admin)
router.put('/:id', verifyToken, validate(updateVodCommentSchema), async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const userName = req.user!.username;
    const isAdmin = req.user!.role === 'admin';

    if (!isAdmin && !(await vodCommentService.isCommentOwner(id, userName))) {
      return res.status(403).json({ success: false, error: 'You can only edit your own comments' });
    }

    const comment = await vodCommentService.updateComment(id, req.body);
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
router.delete('/:id', verifyToken, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const userName = req.user!.username;
    const isAdmin = req.user!.role === 'admin';

    if (!isAdmin && !(await vodCommentService.isCommentOwner(id, userName))) {
      return res.status(403).json({ success: false, error: 'You can only delete your own comments' });
    }

    const success = await vodCommentService.deleteComment(id);
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
