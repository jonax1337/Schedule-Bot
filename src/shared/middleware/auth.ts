import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { logger } from '../utils/logger.js';

const JWT_SECRET = process.env.JWT_SECRET || (() => {
  const generated = crypto.randomBytes(32).toString('hex');
  logger.warn('JWT_SECRET not set', 'Using randomly generated secret - tokens will NOT survive restarts. Set JWT_SECRET in .env for production.');
  return generated;
})();
const JWT_EXPIRES_IN = '24h';
const JWT_ALGORITHM = 'HS256' as const;

export interface AuthRequest extends Request {
  user?: {
    username: string;
    role: 'admin' | 'user';
  };
}

export function generateToken(username: string, role: 'admin' | 'user' = 'admin'): string {
  return jwt.sign({ username, role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN, algorithm: JWT_ALGORITHM });
}

export function verifyTokenSync(token: string): { username: string; role: 'admin' | 'user' } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: [JWT_ALGORITHM] }) as { username: string; role: string };
    return decoded as { username: string; role: 'admin' | 'user' };
  } catch (error) {
    return null;
  }
}

export function verifyToken(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: [JWT_ALGORITHM] }) as { username: string; role: string };
    req.user = decoded as { username: string; role: 'admin' | 'user' };
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token expired' });
    } else if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: 'Invalid token' });
    } else {
      res.status(401).json({ error: 'Authentication failed' });
    }
  }
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
}

export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: [JWT_ALGORITHM] }) as { username: string; role: string };
    req.user = decoded as { username: string; role: 'admin' | 'user' };
  } catch (error) {
    // Token invalid, but continue without user
  }
  
  next();
}
