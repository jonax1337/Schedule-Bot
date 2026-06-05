import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET as string;

// Permissions the bot needs: View Channels, Send Messages, Embed Links,
// Read Message History, Add Reactions, Mention Everyone.
const BOT_PERMISSIONS = (
  (1 << 10) | (1 << 11) | (1 << 14) | (1 << 16) | (1 << 6) | (1 << 17)
).toString(); // 216128

/**
 * Build the Discord "Add to server" URL. `state` is a short-lived signed token
 * binding the invite to an org, verified in the callback. Returns null if the
 * Discord app isn't configured (DISCORD_CLIENT_ID missing).
 */
export function buildBotInviteUrl(orgId: string, redirectUri: string): string | null {
  const clientId = process.env.DISCORD_CLIENT_ID;
  if (!clientId) return null;
  const state = jwt.sign({ orgId, kind: 'bot-invite' }, JWT_SECRET, { expiresIn: '15m' });
  const params = new URLSearchParams({
    client_id: clientId,
    scope: 'bot applications.commands',
    permissions: BOT_PERMISSIONS,
    state,
    redirect_uri: redirectUri,
    response_type: 'code',
  });
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

/** Verify a bot-invite state token; returns the orgId or null. */
export function verifyBotInviteState(state: string): string | null {
  try {
    const decoded = jwt.verify(state, JWT_SECRET) as { orgId?: string; kind?: string };
    return decoded.kind === 'bot-invite' && decoded.orgId ? decoded.orgId : null;
  } catch {
    return null;
  }
}
