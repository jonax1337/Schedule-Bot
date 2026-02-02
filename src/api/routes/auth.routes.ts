import { Router } from 'express';
import { loginLimiter } from '../../shared/middleware/rateLimiter.js';
import { verifyPassword } from '../../shared/middleware/passwordManager.js';
import { generateToken } from '../../shared/middleware/auth.js';
import { getUserMappings } from '../../repositories/user-mapping.repository.js';
import { config } from '../../shared/config/config.js';
import { logger, getErrorMessage } from '../../shared/utils/logger.js';
import { initiateDiscordAuth, handleDiscordCallback, getUserFromSession, logout } from '../controllers/auth.controller.js';

const router = Router();

// Admin authentication with JWT
router.post('/admin/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password required' });
    }
    
    const storedPasswordHash = process.env.ADMIN_PASSWORD_HASH;
    
    if (!storedPasswordHash) {
      logger.error('ADMIN_PASSWORD_HASH not configured');
      return res.status(500).json({ success: false, error: 'Server configuration error' });
    }
    
    if (username === config.admin.username && await verifyPassword(password, storedPasswordHash)) {
      const token = generateToken(username, 'admin');
      
      logger.success('Admin login successful', `User: ${username}`);
      
      res.json({ 
        success: true, 
        token,
        expiresIn: '24h',
        user: {
          username,
          role: 'admin',
        },
      });
    } else {
      logger.warn('Admin login failed', `Invalid credentials for: ${username}`);
      res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
  } catch (error) {
    logger.error('Login error', getErrorMessage(error));
    res.status(500).json({ success: false, error: 'Login failed' });
  }
});

// User login endpoint
router.post('/user/login', loginLimiter, async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ success: false, error: 'Username required' });
    }

    const mappings = await getUserMappings();
    const userMapping = mappings.find(m => m.displayName === username);

    if (!userMapping) {
      logger.warn('User login failed', `User not found: ${username}`);
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // Normal user login always gets 'user' role - admin access requires
    // either admin credentials login or Discord OAuth with isAdmin flag
    const token = generateToken(username, 'user');

    logger.success('User login successful', `User: ${username}`);
    res.json({
      success: true,
      token,
      expiresIn: '24h',
      user: {
        username,
        role: 'user',
      }
    });
  } catch (error) {
    logger.error('User login error', getErrorMessage(error));
    res.status(500).json({ success: false, error: 'Login failed' });
  }
});

// Discord OAuth routes
router.get('/auth/discord', loginLimiter, initiateDiscordAuth);
router.get('/auth/discord/callback', loginLimiter, handleDiscordCallback);
router.get('/auth/user', getUserFromSession);
router.post('/auth/logout', logout);

export default router;
