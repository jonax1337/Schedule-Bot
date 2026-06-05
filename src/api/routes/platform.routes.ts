import { Router } from 'express';
import { verifyToken, generateToken, AuthRequest } from '../../shared/middleware/auth.js';
import {
  getAccountOrganizations,
  getOrganizationBySlug,
  getMembershipRole,
  bindGuild,
  upsertAccountByDiscordId,
  createOrganizationWithOwner,
  SlugError,
} from '../../repositories/organization.repository.js';
import { buildBotInviteUrl, verifyBotInviteState } from '../../shared/utils/botInvite.js';
import { loginLimiter } from '../../shared/middleware/rateLimiter.js';
import { logger, getErrorMessage } from '../../shared/utils/logger.js';

const BOT_CALLBACK_URL =
  (process.env.BOT_API_PUBLIC_URL || 'http://localhost:3001') + '/api/platform/discord/bot-callback';
const DASHBOARD_URL = process.env.DASHBOARD_URL || 'http://localhost:3000';

/**
 * Control-plane routes (account-scoped, NOT tenant-scoped): the SaaS layer where
 * a person signs in and manages which teams (orgs) they own.
 */
const router = Router();

// Local-only shortcut so the team-creation flow is testable without Discord
// OAuth credentials. Gated behind ALLOW_DEV_LOGIN — never enable in production.
const ALLOW_DEV_LOGIN = process.env.ALLOW_DEV_LOGIN === '1';

router.post('/account/dev-login', loginLimiter, async (req, res) => {
  if (!ALLOW_DEV_LOGIN) {
    return res.status(404).json({ error: 'Not found' });
  }
  try {
    const displayName = (req.body?.displayName as string)?.trim() || 'Dev User';
    const discordId = (req.body?.discordId as string)?.trim() || `dev_${displayName.toLowerCase().replace(/\s+/g, '_')}`;
    const accountId = await upsertAccountByDiscordId(discordId, displayName);
    // Control-plane token: 'admin' role so the account can manage the teams it owns.
    const token = generateToken(displayName, 'admin', accountId);
    res.json({ success: true, token, user: { username: displayName, role: 'admin', accountId } });
  } catch (error) {
    logger.error('Dev login failed', getErrorMessage(error));
    res.status(500).json({ error: 'Dev login failed' });
  }
});

/** Orgs the authenticated account may access — powers the org switcher + control plane. */
router.get('/orgs', verifyToken, async (req: AuthRequest, res) => {
  try {
    const accountId = req.user?.accountId;
    if (!accountId) return res.json({ success: true, organizations: [] });
    const organizations = await getAccountOrganizations(accountId);
    res.json({ success: true, organizations });
  } catch (error) {
    logger.error('Failed to list account organizations', getErrorMessage(error));
    res.status(500).json({ error: 'Failed to list organizations' });
  }
});

/** Create a new team (org) owned by the authenticated account. */
router.post('/organizations', verifyToken, async (req: AuthRequest, res) => {
  const accountId = req.user?.accountId;
  if (!accountId) {
    return res.status(403).json({ error: 'Token is not bound to an account' });
  }
  try {
    const { slug, name } = req.body ?? {};
    if (!slug) return res.status(400).json({ error: 'slug is required' });
    const org = await createOrganizationWithOwner(accountId, String(slug), String(name ?? ''));
    logger.success('Organization created', `${org.slug} by ${accountId}`);
    res.json({ success: true, organization: { slug: org.slug, name: org.name } });
  } catch (error) {
    if (error instanceof SlugError) {
      return res.status(400).json({ error: error.message });
    }
    logger.error('Failed to create organization', getErrorMessage(error));
    res.status(500).json({ error: 'Failed to create organization' });
  }
});

/** Build the "Add to Discord" invite URL for a team the account owns/administers. */
router.get('/organizations/:slug/invite', verifyToken, async (req: AuthRequest, res) => {
  const accountId = req.user?.accountId;
  if (!accountId) return res.status(403).json({ error: 'Token is not bound to an account' });
  try {
    const org = await getOrganizationBySlug(String(req.params.slug));
    if (!org) return res.status(404).json({ error: 'Unknown team' });
    const role = await getMembershipRole(accountId, org.id);
    if (role !== 'OWNER' && role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only an owner/admin can connect Discord' });
    }
    const url = buildBotInviteUrl(org.id, BOT_CALLBACK_URL);
    if (!url) return res.status(400).json({ error: 'Discord app not configured (DISCORD_CLIENT_ID missing)' });
    res.json({ success: true, url });
  } catch (error) {
    logger.error('Failed to build bot invite', getErrorMessage(error));
    res.status(500).json({ error: 'Failed to build invite' });
  }
});

/** Discord redirects here after the bot is added — bind the guild to the org. */
router.get('/discord/bot-callback', async (req, res) => {
  const state = req.query.state as string | undefined;
  const guildId = req.query.guild_id as string | undefined;
  const orgId = state ? verifyBotInviteState(state) : null;
  if (!orgId) {
    return res.redirect(`${DASHBOARD_URL}/control?bot=error`);
  }
  try {
    if (guildId) {
      await bindGuild(orgId, guildId);
      logger.success('Guild bound to org', `${guildId} → ${orgId}`);
    }
    res.redirect(`${DASHBOARD_URL}/control?bot=connected`);
  } catch (error) {
    logger.error('Bot callback failed', getErrorMessage(error));
    res.redirect(`${DASHBOARD_URL}/control?bot=error`);
  }
});

export default router;
