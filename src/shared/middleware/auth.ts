import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { logger, getErrorMessage } from '../utils/logger.js';
import { getUserMappings } from '../../repositories/user-mapping.repository.js';

if (!process.env.JWT_SECRET) {
  logger.error('JWT_SECRET not set', 'Set JWT_SECRET in .env before starting the server.');
  process.exit(1);
}
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '24h';
const JWT_ALGORITHM = 'HS256' as const;

export interface ResolvedUserMapping {
  discordId: string;
  discordUsername: string;
  displayName: string;
  role: string;
  timezone?: string | null;
}

export interface AuthRequest extends Request {
  user?: {
    username: string;
    role: 'admin' | 'user';
  };
  /** The user mapping for the currently logged-in user (set by resolveCurrentUser) */
  resolvedUser?: ResolvedUserMapping;
  /** The target userId for the operation (set by resolveTargetUser) */
  targetUserId?: string;
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

/**
 * Middleware: Resolve the current logged-in user to their userMapping.
 * Sets `req.resolvedUser` with the mapping. Admins skip resolution.
 * Must be used after `verifyToken`.
 */
export async function resolveCurrentUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  if (req.user?.role === 'admin') {
    return next();
  }

  try {
    const mappings = await getUserMappings();
    const mapping = mappings.find(m => m.displayName === req.user?.username);
    if (!mapping) {
      res.status(404).json({ error: 'User mapping not found' });
      return;
    }
    req.resolvedUser = mapping;
    next();
  } catch (error) {
    logger.error('Error resolving current user', getErrorMessage(error));
    res.status(500).json({ error: 'Failed to resolve user' });
  }
}

/**
 * Middleware: Resolve the target userId for write operations.
 * Admins can specify a userId in body or query; non-admins always get their own.
 * Sets `req.targetUserId`. Must be used after `verifyToken`.
 */
export async function resolveTargetUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const isAdmin = req.user?.role === 'admin';
  const requestedUserId = (req.body?.userId || req.query?.userId) as string | undefined;

  if (isAdmin && requestedUserId) {
    req.targetUserId = requestedUserId;
    return next();
  }

  try {
    const mappings = await getUserMappings();
    const mapping = mappings.find(m => m.displayName === req.user?.username);
    if (!mapping) {
      res.status(404).json({ error: 'User mapping not found' });
      return;
    }
    req.resolvedUser = mapping;
    req.targetUserId = mapping.discordId;
    next();
  } catch (error) {
    logger.error('Error resolving target user', getErrorMessage(error));
    res.status(500).json({ error: 'Failed to resolve user' });
  }
}

/**
 * Factory: Check that the current user owns the resource or is admin.
 * Must be used after `resolveCurrentUser`.
 */
export function requireOwnershipOrAdmin(getUserId: (req: AuthRequest) => string | undefined) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (req.user?.role === 'admin') {
      return next();
    }
    const targetUserId = getUserId(req);
    if (!targetUserId || req.resolvedUser?.discordId === targetUserId) {
      return next();
    }
    res.status(403).json({ error: 'You can only manage your own data' });
  };
}
