import { Router } from 'express';
import type { AuthRequest } from '../../shared/middleware/auth.js';
import { verifyToken, requireAdmin } from '../../shared/middleware/auth.js';
import { hashPassword } from '../../shared/middleware/passwordManager.js';
import { logger } from '../../shared/utils/logger.js';

const router = Router();

// Generate password hash
router.post('/generate-password-hash', verifyToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }
    
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }
    
    const hash = await hashPassword(password);
    
    logger.success('Password hash generated', `by ${req.user?.username}`);
    res.json({ success: true, hash });
  } catch (error) {
    console.error('Error generating password hash:', error);
    logger.error('Failed to generate password hash', error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: 'Failed to generate password hash' });
  }
});

export default router;
