import { Request, Response } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { getUserMapping } from '../../repositories/user-mapping.repository.js';
import { getCurrentOrgId } from '../../shared/tenancy/orgContext.js';
import { logger } from '../../shared/utils/logger.js';
import { mintHandoff } from '../../shared/utils/handoff.js';

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
const DASHBOARD_URL = process.env.DASHBOARD_URL || 'http://localhost:3000';

/** A return target is the literal 'control' or a clean team slug. `returnTo` is
 *  interpolated into the redirect host, so anything else is an open redirect —
 *  which would hand the single-use handoff code (the session) to an attacker
 *  host. Validate at initiate AND callback (defense in depth). */
function isValidReturnTo(returnTo: string): boolean {
  return returnTo === 'control' || /^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/.test(returnTo);
}

/** Origin for a login context: a team slug → its subdomain; 'control' → the
 *  control-plane host. Derived from DASHBOARD_URL, so prod (https://app.synqed.org)
 *  yields https://<slug>.synqed.org and dev (http://localhost:3000) works too. */
function contextOrigin(returnTo: string): string {
  if (!returnTo || returnTo === 'control') return DASHBOARD_URL;
  const u = new URL(DASHBOARD_URL);
  const proto = u.protocol.replace(':', '');
  const port = u.port ? `:${u.port}` : '';
  const baseHost =
    u.hostname === 'localhost' || u.hostname.endsWith('.localhost')
      ? 'localhost'
      : u.hostname.split('.').slice(-2).join('.');
  return `${proto}://${returnTo}.${baseHost}${port}`;
}

/** Where the SPA lands after the OAuth round-trip (control plane, team root on
 *  success, or the relevant login page on error). */
function landingUrl(returnTo: string, ok: boolean, suffix: string): string {
  const origin = contextOrigin(returnTo);
  const path = !returnTo || returnTo === 'control' ? '/control' : ok ? '/' : '/login';
  return `${origin}${path}${suffix}`;
}

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Initiate Discord OAuth. Query params:
 *   - return: where to land after login — a team slug (→ <slug>.synqed.org) or
 *     'control' (→ control plane). Default 'control'.
 *   - csrf: a nonce the SPA generated and stashed in sessionStorage; it's signed
 *     into the state and re-checked when the handoff is redeemed (binds login to
 *     that browser session → anti login-CSRF).
 * Gated only on the OAuth app being configured (not on any per-team toggle —
 * this runs on the tenant-less api host).
 */
export async function initiateDiscordAuth(req: Request, res: Response) {
  try {
    if (!CLIENT_ID || !CLIENT_SECRET) {
      logger.error('Discord OAuth credentials not configured');
      return res.status(500).json({ error: 'OAuth not configured', message: 'Discord OAuth credentials missing in environment' });
    }

    const returnTo = (req.query.return as string | undefined)?.trim() || 'control';
    const csrf = (req.query.csrf as string | undefined)?.trim() || '';

    if (!isValidReturnTo(returnTo)) {
      return res.status(400).json({ error: 'Invalid return target' });
    }

    // Signed, short-lived state carries the CSRF nonce + return target through the
    // Discord round-trip. Stateless → survives redeploys / multiple replicas.
    const state = jwt.sign({ kind: 'discord-oauth', csrf, returnTo }, JWT_SECRET, { expiresIn: '10m' });

    // No prompt=none: a brand-new customer hasn't authorized the app yet, and
    // prompt=none would error instead of showing the consent screen.
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope: 'identify',
      state,
    });

    res.json({ url: `${DISCORD_OAUTH_URL}?${params.toString()}` });
  } catch (error) {
    logger.error('Error initiating Discord auth:', String(error));
    res.status(500).json({ error: 'Failed to initiate authentication' });
  }
}

/**
 * Handle Discord OAuth callback
 */
export async function handleDiscordCallback(req: Request, res: Response) {
  // Registered Discord redirect (neutral api host). Runs server-side and
  // 302-redirects back to the context that started login (control plane / team
  // subdomain) with a single-use handoff code — no tenant-less JSON hop, no CORS.
  let returnTo = 'control';
  try {
    const { code, state } = req.query;

    if (typeof state !== 'string' || !state) {
      logger.warn('Discord callback: missing state');
      return res.redirect(landingUrl(returnTo, false, '?error=auth'));
    }

    // Verify the signed state; extract the return target + CSRF nonce.
    let csrf = '';
    try {
      const decoded = jwt.verify(state, JWT_SECRET) as { kind?: string; csrf?: string; returnTo?: string };
      if (decoded.kind !== 'discord-oauth') throw new Error('wrong kind');
      returnTo = decoded.returnTo || 'control';
      csrf = decoded.csrf || '';
    } catch (e) {
      logger.warn('Discord callback: state verify failed', String(e));
      return res.redirect(landingUrl(returnTo, false, '?error=auth'));
    }

    // Defense in depth: the state is ours (validated at initiate), but never
    // build a redirect host from an unvalidated target.
    if (!isValidReturnTo(returnTo)) returnTo = 'control';

    if (typeof code !== 'string' || !code) {
      logger.warn('Discord callback: missing code');
      return res.redirect(landingUrl(returnTo, false, '?error=auth'));
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
      logger.error('Token exchange failed:', await tokenResponse.text());
      return res.redirect(landingUrl(returnTo, false, '?error=auth'));
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
      return res.redirect(landingUrl(returnTo, false, '?error=auth'));
    }

    const discordUser = await userResponse.json();
    const discordId = discordUser.id;
    const discordUsername = discordUser.username;

    // Ensure a control-plane account exists for this Discord identity.
    const { upsertAccountByDiscordId, getOrganizationBySlug } = await import('../../repositories/organization.repository.js');
    const accountId = await upsertAccountByDiscordId(discordId, discordUsername);

    // Per-context identity + role:
    //  - control: any Discord user; identity = their Discord name.
    //  - team: must be a roster player OR an owner/admin of THAT org; identity =
    //    their roster display name (so they appear as their player), role = admin
    //    if owner/admin-membership or a roster is_admin entry.
    let username = discordUsername;
    let role: 'admin' | 'user' = 'user';
    if (returnTo && returnTo !== 'control') {
      const org = await getOrganizationBySlug(returnTo);
      if (!org) return res.redirect(landingUrl(returnTo, false, '?error=unknown-team'));
      const { runWithOrg } = await import('../../shared/tenancy/orgContext.js');
      const { resolveOrgRole } = await import('../../shared/middleware/auth.js');
      let access = false;
      let admin = false;
      await runWithOrg(org.id, async () => {
        const r = await resolveOrgRole(accountId, org.id);
        access = r.access;
        admin = r.admin;
        const m = await getUserMapping(discordId);
        if (m?.displayName) username = m.displayName;
      });
      if (!access) return res.redirect(landingUrl(returnTo, false, '?error=no-access'));
      role = admin ? 'admin' : 'user';
    }

    // Deliver the session to the originating context via a single-use, csrf-bound
    // handoff code (consumed on landing). No bearer token in the URL.
    const handoff = mintHandoff({ accountId, username, role, csrf });
    return res.redirect(landingUrl(returnTo, true, `#handoff=${encodeURIComponent(handoff)}`));
  } catch (error) {
    logger.error('Error handling Discord callback:', String(error));
    res.redirect(landingUrl(returnTo, false, '?error=auth'));
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
            const { resolveOrgRole } = await import('../../shared/middleware/auth.js');
            const { admin } = await resolveOrgRole(decoded.accountId, orgId);
            if (admin) role = 'admin';
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
