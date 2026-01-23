import { Router } from 'express';
import { verifyToken, requireAdmin, AuthRequest } from '../../shared/middleware/auth.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { logger } from '../../shared/utils/logger.js';

const router = Router();

// Generate a new salt
router.post('/generate-salt', verifyToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    // Generate a random 32-byte salt and convert to hex
    const salt = crypto.randomBytes(32).toString('hex');
    
    logger.success('Salt generated', `by ${req.user?.username}`);
    res.json({ success: true, salt });
  } catch (error) {
    console.error('Error generating salt:', error);
    logger.error('Failed to generate salt', error instanceof Error ? error.message : String(error));
    res.status(500).json({ success: false, error: 'Failed to generate salt' });
  }
});

// Hash password with current salt from .env
router.post('/hash-password', verifyToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({ success: false, error: 'Password is required' });
    }

    const salt = process.env.PASSWORD_SALT;
    if (!salt) {
      return res.status(500).json({ success: false, error: 'PASSWORD_SALT not found in .env' });
    }

    // Hash password with bcrypt using the salt from .env
    const hash = await bcrypt.hash(password + salt, 12);
    
    logger.success('Password hash generated with current salt', `by ${req.user?.username}`);
    res.json({ success: true, hash });
  } catch (error) {
    console.error('Error hashing password:', error);
    logger.error('Failed to hash password', error instanceof Error ? error.message : String(error));
    res.status(500).json({ success: false, error: 'Failed to hash password' });
  }
});

// Hash password with custom salt
router.post('/hash-password-custom', verifyToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { password, salt } = req.body;
    
    if (!password || !salt) {
      return res.status(400).json({ success: false, error: 'Password and salt are required' });
    }

    // Hash password with bcrypt using the custom salt
    const hash = await bcrypt.hash(password + salt, 12);
    
    logger.success('Password hash generated with custom salt', `by ${req.user?.username}`);
    res.json({ success: true, hash });
  } catch (error) {
    console.error('Error hashing password:', error);
    logger.error('Failed to hash password with custom salt', error instanceof Error ? error.message : String(error));
    res.status(500).json({ success: false, error: 'Failed to hash password' });
  }
});

export default router;
