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
    /** Control-plane account id; drives org-membership checks. */
    accountId?: string;
  };
  /** The user mapping for the currently logged-in user (set by resolveCurrentUser) */
  resolvedUser?: ResolvedUserMapping;
  /** The target userId for the operation (set by resolveTargetUser) */
  targetUserId?: string;
}

export function generateToken(username: string, role: 'admin' | 'user' = 'admin', accountId?: string): string {
  return jwt.sign({ username, role, accountId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN, algorithm: JWT_ALGORITHM });
}

export function verifyTokenSync(token: string): { username: string; role: 'admin' | 'user'; accountId?: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: [JWT_ALGORITHM] }) as { username: string; role: string; accountId?: string };
    return decoded as { username: string; role: 'admin' | 'user'; accountId?: string };
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
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: [JWT_ALGORITHM] }) as { username: string; role: string; accountId?: string };
    req.user = decoded as { username: string; role: 'admin' | 'user'; accountId?: string };
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

/**
 * An account's access + admin status for the CURRENT org. Must run inside the
 * org's context (the tenant middleware's runWithOrg), since the roster lookup is
 * tenant-scoped. Two ways into a team:
 *   - access  = org Membership (OWNER/ADMIN/MEMBER) OR being in the team roster
 *               (user_mapping). A roster player needs no Membership; an owner
 *               needs no roster entry. (An owner who is ALSO a roster player gets
 *               both — the higher privilege wins below.)
 *   - admin   = Membership OWNER/ADMIN OR a roster entry flagged is_admin.
 */
export async function resolveOrgRole(accountId: string, orgId: string): Promise<{ access: boolean; admin: boolean }> {
  const { getMembershipRole, getAccountDiscordId } = await import('../../repositories/organization.repository.js');
  const { getUserMapping } = await import('../../repositories/user-mapping.repository.js');
  const membership = await getMembershipRole(accountId, orgId);
  const discordId = await getAccountDiscordId(accountId);
  const mapping = discordId ? await getUserMapping(discordId) : null;
  return {
    access: !!membership || !!mapping,
    admin: membership === 'OWNER' || membership === 'ADMIN' || !!mapping?.isAdmin,
  };
}

export async function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  if (req.user?.role === 'admin') {
    return next();
  }
  // An org owner/admin — or a roster player flagged is_admin — gets admin access
  // on their own team, independent of the legacy JWT role. Org is set by the
  // tenant middleware.
  const org = (req as AuthRequest & { org?: { id: string } }).org;
  const accountId = req.user?.accountId;
  if (org && accountId) {
    try {
      const { admin } = await resolveOrgRole(accountId, org.id);
      if (admin) return next();
    } catch (error) {
      logger.error('Admin role check failed', getErrorMessage(error));
    }
  }
  res.status(403).json({ error: 'Admin access required' });
}

export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: [JWT_ALGORITHM] }) as { username: string; role: string; accountId?: string };
    req.user = decoded as { username: string; role: 'admin' | 'user'; accountId?: string };
  } catch (error) {
    // Token invalid, but continue without user
  }

  next();
}

/**
 * Require that the authenticated account has a membership in the resolved org.
 * This is the authority for cross-tenant access control — it closes the
 * spoofable-X-Tenant IDOR (a token for org A cannot read org B's data).
 * Must run after `verifyToken` and the tenant middleware (which sets req.org).
 */
export async function requireOrgMembership(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const org = (req as AuthRequest & { org?: { id: string } }).org;
  const accountId = req.user?.accountId;

  if (!org) {
    res.status(500).json({ error: 'Tenant not resolved' });
    return;
  }
  if (!accountId) {
    res.status(403).json({ error: 'Token is not bound to an account' });
    return;
  }

  try {
    const { access } = await resolveOrgRole(accountId, org.id);
    if (!access) {
      res.status(403).json({ error: 'No access to this team' });
      return;
    }
    next();
  } catch (error) {
    logger.error('Org access check failed', getErrorMessage(error));
    res.status(500).json({ error: 'Access check failed' });
  }
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
