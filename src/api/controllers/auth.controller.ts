import { Request, Response } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { getUserMapping } from '../../repositories/user-mapping.repository.js';
import { getCurrentOrgId } from '../../shared/tenancy/orgContext.js';
import { logger } from '../../shared/utils/logger.js';

interface OAuthSession {
  discordId: string;
  username: string;
  expiresAt: number;
}

// Legacy session-token store (the JWT flow is the primary path).
const sessionStore = new Map<string, OAuthSession>();

const DISCORD_OAUTH_URL = 'https://discord.com/api/oauth2/authorize';
const DISCORD_TOKEN_URL = 'https://discord.com/api/oauth2/token';
const DISCORD_USER_URL = 'https://discord.com/api/users/@me';

// Environment variables
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || 'http://localhost:3000/api/auth/callback';
const JWT_SECRET = process.env.JWT_SECRET as string;

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Initiate Discord OAuth flow
 */
export async function initiateDiscordAuth(req: Request, res: Response) {
  try {
    // Discord OAuth is the platform's primary sign-in (control plane + teams) and
    // is initiated on the apex/api host where there is no tenant, so it is gated
    // only on the OAuth app being configured — not on a per-team toggle, which
    // isn't resolvable here. A team can still hide the Discord button client-side.
    if (!CLIENT_ID || !CLIENT_SECRET) {
      logger.error('Discord OAuth credentials not configured');
      return res.status(500).json({ 
        error: 'OAuth not configured',
        message: 'Discord OAuth credentials missing in environment'
      });
    }

    // Stateless CSRF state: a short-lived signed token instead of an in-memory
    // store, so it survives redeploys and works across multiple replicas.
    // Bind the CSRF state to the caller's browser session (cookie-less): a random
    // nonce is embedded in the signed state AND returned for the SPA to stash in
    // sessionStorage and echo back on the callback. A forged or cross-victim
    // callback can't supply the matching nonce → blocks login-CSRF.
    const nonce = crypto.randomBytes(16).toString('hex');
    const state = jwt.sign({ kind: 'discord-oauth', nonce }, JWT_SECRET, { expiresIn: '10m' });

    // Build OAuth URL. No prompt=none: a brand-new customer hasn't authorized the
    // app yet, and prompt=none would error instead of showing the consent screen.
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope: 'identify',
      state,
    });

    const authUrl = `${DISCORD_OAUTH_URL}?${params.toString()}`;

    res.json({ url: authUrl, nonce });
  } catch (error) {
    logger.error('Error initiating Discord auth:', String(error));
    res.status(500).json({ error: 'Failed to initiate authentication' });
  }
}

/**
 * Handle Discord OAuth callback
 */
export async function handleDiscordCallback(req: Request, res: Response) {
  try {
    // Set CORS headers explicitly for this endpoint
    const origin = req.headers.origin;
    const allowedOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      process.env.DASHBOARD_URL,
    ].filter(Boolean);
    
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    
    const { code, state } = req.query;
    const sStr = typeof state === 'string' ? state : '';
    const nStr = (req.query.nonce as string | undefined) || '';
    logger.info(
      'Discord callback received',
      `code=${!!code} stateHead=${sStr.slice(0, 10)} stateLen=${sStr.length} nonceLen=${nStr.length} origin=${origin ?? 'none'}`,
    );

    if (!code || typeof code !== 'string') {
      logger.warn('Discord callback: missing code');
      return res.status(400).json({ error: 'Missing authorization code' });
    }

    if (!state || typeof state !== 'string') {
      logger.warn('Discord callback: missing state');
      return res.status(400).json({ error: 'Missing state parameter' });
    }

    // Verify the signed state (CSRF) AND that it's bound to this browser session:
    // the nonce in the signed state must equal the one the SPA echoes back (which
    // it stashed in sessionStorage when initiating). Stateless — no server store.
    try {
      const decoded = jwt.verify(state, JWT_SECRET) as { kind?: string; nonce?: string };
      const nonce = (req.query.nonce as string | undefined) || '';
      if (decoded.kind !== 'discord-oauth' || !decoded.nonce || decoded.nonce !== nonce) {
        logger.warn('Discord callback: state/nonce mismatch', `kind=${decoded.kind} stateNonce=${!!decoded.nonce} provided=${!!nonce} match=${decoded.nonce === nonce}`);
        throw new Error('state/nonce mismatch');
      }
    } catch (e) {
      logger.warn('Discord callback: state verify failed', String(e));
      return res.status(400).json({ error: 'Invalid or expired state' });
    }

    // Exchange code for access token
    const tokenResponse = await fetch(DISCORD_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: CLIENT_ID!,
        client_secret: CLIENT_SECRET!,
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      logger.error('Token exchange failed:', errorData);
      return res.status(500).json({ error: 'Failed to exchange authorization code' });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Get user info from Discord
    const userResponse = await fetch(DISCORD_USER_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userResponse.ok) {
      return res.status(500).json({ error: 'Failed to fetch user information' });
    }

    const discordUser = await userResponse.json();
    const discordId = discordUser.id;
    const discordUsername = discordUser.username;

    // Always ensure a control-plane account exists for this Discord identity.
    const { upsertAccountByDiscordId } = await import('../../repositories/organization.repository.js');
    const accountId = await upsertAccountByDiscordId(discordId, discordUsername);

    // A team member (has a mapping in the active org) keeps their dashboard role;
    // a brand-new customer (no mapping) signs in to the control plane to create a team.
    // On the control plane (apex) there is no org context, so this tenant-scoped
    // lookup can't run — that's fine, the control-plane login only needs the
    // account; per-team roles are enforced per-org via membership checks.
    let mapping: Awaited<ReturnType<typeof getUserMapping>> | null = null;
    try {
      mapping = await getUserMapping(discordId);
    } catch {
      mapping = null;
    }
    const { generateToken } = await import('../../shared/middleware/auth.js');
    const jwtRole = mapping?.isAdmin ? 'admin' : 'user';
    const username = mapping?.displayName ?? discordUsername;
    const token = generateToken(username, jwtRole, accountId);

    // Build Discord avatar URL
    const avatarUrl = discordUser.avatar
      ? `https://cdn.discordapp.com/avatars/${discordId}/${discordUser.avatar}.${discordUser.avatar.startsWith('a_') ? 'gif' : 'png'}?size=128`
      : null;

    res.json({
      success: true,
      token,
      user: {
        id: discordUser.id,
        username,
        role: jwtRole,
        discordId,
        discordUsername,
        avatar: avatarUrl,
      },
    });
  } catch (error) {
    logger.error('Error handling Discord callback:', String(error));
    res.status(500).json({ error: 'Authentication failed' });
  }
}

/**
 * Verify session token
 */
export function verifySession(sessionToken: string): OAuthSession | null {
  const session = sessionStore.get(sessionToken);
  if (!session) return null;

  if (session.expiresAt < Date.now()) {
    sessionStore.delete(sessionToken);
    return null;
  }

  return session;
}

/**
 * Get user info from session or JWT token
 */
export async function getUserFromSession(req: Request, res: Response) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    
    // Try to verify as JWT token first
    try {
      const { verifyTokenSync } = await import('../../shared/middleware/auth.js');
      const decoded = verifyTokenSync(token);

      if (decoded) {
        // On a team (org context resolved from the subdomain/X-Tenant), an
        // account that OWNS or ADMINs the org gets admin access in the dashboard
        // — independent of the legacy user_mappings roster. This is the authority
        // for "am I admin here", since the JWT role is set tenant-agnostically at
        // login on the control plane.
        let role = decoded.role;
        const orgId = getCurrentOrgId();
        if (role !== 'admin' && orgId && decoded.accountId) {
          try {
            const { getMembershipRole } = await import('../../repositories/organization.repository.js');
            const mRole = await getMembershipRole(decoded.accountId, orgId);
            if (mRole === 'OWNER' || mRole === 'ADMIN') role = 'admin';
          } catch { /* fall back to the JWT role */ }
        }
        return res.json({
          username: decoded.username,
          role,
          valid: true,
        });
      }
    } catch (jwtError) {
      // If JWT verification fails, try session token (for backward compatibility)
      const session = verifySession(token);
      
      if (session) {
        return res.json({
          username: session.username,
          discordId: session.discordId,
          valid: true,
        });
      }
      
      // Both JWT and session validation failed
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    res.status(401).json({ error: 'Invalid token' });
  } catch (error) {
    logger.error('Error getting user from token:', String(error));
    res.status(500).json({ error: 'Failed to get user info' });
  }
}

/**
 * Logout - destroy session
 */
export function logout(req: Request, res: Response) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const sessionToken = authHeader.substring(7);
      sessionStore.delete(sessionToken);
    }

    res.json({ success: true });
  } catch (error) {
    logger.error('Error during logout:', String(error));
    res.status(500).json({ error: 'Logout failed' });
  }
}
