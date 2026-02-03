import { Router } from 'express';
import { verifyToken, AuthRequest } from '../../shared/middleware/auth.js';
import { validate, createVodCommentSchema, updateVodCommentSchema } from '../../shared/middleware/validation.js';
import { vodCommentService } from '../../services/vod-comment.service.js';
import { logger } from '../../shared/utils/logger.js';
import { sendOk, sendServerError, sendNotFound, sendForbidden } from '../../shared/utils/apiResponse.js';

const router = Router();

// Get all comments for a scrim
router.get('/scrim/:scrimId', async (req, res) => {
  try {
    const comments = await vodCommentService.getCommentsByScrimId(req.params.scrimId as string);
    return sendOk(res, { comments });
  } catch (error) {
    return sendServerError(res, error, 'Fetch VOD comments');
  }
});

// Create a comment
router.post('/', verifyToken, validate(createVodCommentSchema), async (req: AuthRequest, res) => {
  try {
    const { scrimId, timestamp, content } = req.body;
    const userName = req.user!.username;
    const comment = await vodCommentService.createComment(scrimId, userName, timestamp, content);
    logger.info('VOD comment created', `Scrim ${scrimId} by ${userName}`);
    return sendOk(res, { comment });
  } catch (error) {
    return sendServerError(res, error, 'Create VOD comment');
  }
});

// Update a comment (owner or admin)
router.put('/:id', verifyToken, validate(updateVodCommentSchema), async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const userName = req.user!.username;
    const isAdmin = req.user!.role === 'admin';

    if (!isAdmin && !(await vodCommentService.isCommentOwner(id, userName))) {
      return sendForbidden(res, 'You can only edit your own comments');
    }

    const comment = await vodCommentService.updateComment(id, req.body);
    if (comment) {
      return sendOk(res, { comment });
    } else {
      return sendNotFound(res, 'Comment');
    }
  } catch (error) {
    return sendServerError(res, error, 'Update VOD comment');
  }
});

// Delete a comment (owner or admin)
router.delete('/:id', verifyToken, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const userName = req.user!.username;
    const isAdmin = req.user!.role === 'admin';

    if (!isAdmin && !(await vodCommentService.isCommentOwner(id, userName))) {
      return sendForbidden(res, 'You can only delete your own comments');
    }

    const success = await vodCommentService.deleteComment(id);
    if (success) {
      logger.info('VOD comment deleted', `ID ${id} by ${userName}`);
      return sendOk(res, {});
    } else {
      return sendNotFound(res, 'Comment');
    }
  } catch (error) {
    return sendServerError(res, error, 'Delete VOD comment');
  }
});

export default router;
