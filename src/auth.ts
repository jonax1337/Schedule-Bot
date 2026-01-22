import { Request, Response } from 'express';
import crypto from 'crypto';
import { getUserMapping } from './database/userMappings.js';
import { loadSettings } from './settingsManager.js';

interface OAuthState {
  state: string;
  timestamp: number;
}

interface OAuthSession {
  discordId: string;
  username: string;
  expiresAt: number;
}

// Store state tokens temporarily (in production, use Redis)
const stateStore = new Map<string, OAuthState>();
const sessionStore = new Map<string, OAuthSession>();

const DISCORD_OAUTH_URL = 'https://discord.com/api/oauth2/authorize';
const DISCORD_TOKEN_URL = 'https://discord.com/api/oauth2/token';
const DISCORD_USER_URL = 'https://discord.com/api/users/@me';

// Environment variables
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || 'http://localhost:3000/api/auth/callback';

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function generateState(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Initiate Discord OAuth flow
 */
export async function initiateDiscordAuth(req: Request, res: Response) {
  try {
    const settings = loadSettings();
    
    // Check if Discord Auth is enabled
    if (!settings.discord.allowDiscordAuth) {
      return res.status(403).json({ 
        error: 'Discord authentication is disabled',
        message: 'Please enable Discord Auth in settings or use traditional login'
      });
    }

    if (!CLIENT_ID || !CLIENT_SECRET) {
      console.error('Discord OAuth credentials not configured');
      return res.status(500).json({ 
        error: 'OAuth not configured',
        message: 'Discord OAuth credentials missing in environment'
      });
    }

    // Generate state for CSRF protection
    const state = generateState();
    stateStore.set(state, {
      state,
      timestamp: Date.now(),
    });

    // Clean up old states (older than 10 minutes)
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
    for (const [key, value] of stateStore.entries()) {
      if (value.timestamp < tenMinutesAgo) {
        stateStore.delete(key);
      }
    }

    // Build OAuth URL
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope: 'identify',
      state,
      prompt: 'none', // Skip consent screen if already authorized
    });

    const authUrl = `${DISCORD_OAUTH_URL}?${params.toString()}`;
    
    res.json({ url: authUrl });
  } catch (error) {
    console.error('Error initiating Discord auth:', error);
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

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Missing authorization code' });
    }

    if (!state || typeof state !== 'string') {
      return res.status(400).json({ error: 'Missing state parameter' });
    }

    // Verify state
    const storedState = stateStore.get(state);
    if (!storedState) {
      return res.status(400).json({ error: 'Invalid or expired state' });
    }
    stateStore.delete(state);

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
      console.error('Token exchange failed:', errorData);
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

    // Check if user has mapping
    const mapping = await getUserMapping(discordId);
    if (!mapping) {
      return res.status(403).json({ 
        error: 'No user mapping found',
        message: 'Your Discord account is not linked to a schedule user. Please contact an admin.',
        discordId,
        discordUsername,
      });
    }

    // Generate JWT token instead of session token
    const { generateToken } = await import('./middleware/auth.js');
    const token = generateToken(mapping.sheetColumnName, 'user');

    res.json({
      success: true,
      token,
      expiresIn: '24h',
      user: {
        username: mapping.sheetColumnName,
        role: 'user',
        discordId,
        discordUsername,
      },
    });
  } catch (error) {
    console.error('Error handling Discord callback:', error);
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
      const { verifyTokenSync } = await import('./middleware/auth.js');
      const decoded = verifyTokenSync(token);
      
      if (decoded) {
        return res.json({
          username: decoded.username,
          role: decoded.role,
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
    console.error('Error getting user from token:', error);
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
    console.error('Error during logout:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
}
