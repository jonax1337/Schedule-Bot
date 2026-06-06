import { Router } from 'express';
import { verifyToken, requireOrgMembership, requireOrgAdmin, AuthRequest } from '../../shared/middleware/auth.js';
import type { TenantRequest } from '../../shared/middleware/tenant.js';
import {
  getOrgMemberships,
  setMembershipRoleByDiscordId,
  removeMembershipByDiscordId,
  type OrgRoleValue,
} from '../../repositories/organization.repository.js';
import { getUserMappings } from '../../repositories/user-mapping.repository.js';
import { logger, getErrorMessage } from '../../shared/utils/logger.js';

/**
 * Member / access-role management for a team. Owner/Admin only (requireOrgAdmin).
 * Lists the team's people (roster ∪ memberships) with their roster position and
 * access role, and lets owner/admin assign the access role (OWNER excluded —
 * ownership isn't reassigned here).
 */
const router = Router();
const ASSIGNABLE = new Set<OrgRoleValue>(['ADMIN', 'MANAGER', 'MEMBER']);

router.get('/', verifyToken, requireOrgMembership, requireOrgAdmin, async (req: AuthRequest, res) => {
  try {
    const org = (req as TenantRequest).org!;
    const [memberships, roster] = await Promise.all([getOrgMemberships(org.id), getUserMappings()]);
    const roleByDiscord = new Map(memberships.filter((m) => m.discordId).map((m) => [m.discordId!, m.role]));

    const people = roster.map((r) => ({
      discordId: r.discordId,
      displayName: r.displayName,
      rosterRole: r.role as string | null,
      accessRole: roleByDiscord.get(r.discordId) ?? null,
    }));
    // Membership-only people (e.g. owner/admin not on the roster).
    const rosterIds = new Set(roster.map((r) => r.discordId));
    for (const m of memberships) {
      if (m.discordId && !rosterIds.has(m.discordId)) {
        people.push({ discordId: m.discordId, displayName: m.displayName, rosterRole: null, accessRole: m.role });
      }
    }
    res.json({ success: true, members: people });
  } catch (error) {
    logger.error('Failed to list members', getErrorMessage(error));
    res.status(500).json({ error: 'Failed to list members' });
  }
});

router.post('/role', verifyToken, requireOrgMembership, requireOrgAdmin, async (req: AuthRequest, res) => {
  try {
    const org = (req as TenantRequest).org!;
    const discordId = (req.body?.discordId as string | undefined)?.trim();
    const displayName = (req.body?.displayName as string | undefined)?.trim() || discordId || '';
    const role = (req.body?.role as string | undefined)?.trim() as OrgRoleValue | undefined;
    if (!discordId || !role) return res.status(400).json({ error: 'discordId and role are required' });
    if (!ASSIGNABLE.has(role)) return res.status(400).json({ error: 'Role must be ADMIN, MANAGER or MEMBER' });

    // Never reassign/override the owner via this endpoint.
    const current = await getOrgMemberships(org.id);
    if (current.find((m) => m.discordId === discordId)?.role === 'OWNER') {
      return res.status(403).json({ error: 'Cannot change the team owner' });
    }
    await setMembershipRoleByDiscordId(discordId, displayName, org.id, role);
    logger.success('Member role set', `${discordId} → ${role} in ${org.slug}`);
    res.json({ success: true });
  } catch (error) {
    logger.error('Failed to set member role', getErrorMessage(error));
    res.status(500).json({ error: 'Failed to set role' });
  }
});

router.delete('/role', verifyToken, requireOrgMembership, requireOrgAdmin, async (req: AuthRequest, res) => {
  try {
    const org = (req as TenantRequest).org!;
    const discordId = (req.query.discordId as string | undefined)?.trim();
    if (!discordId) return res.status(400).json({ error: 'discordId is required' });
    const current = await getOrgMemberships(org.id);
    if (current.find((m) => m.discordId === discordId)?.role === 'OWNER') {
      return res.status(403).json({ error: 'Cannot remove the team owner' });
    }
    await removeMembershipByDiscordId(discordId, org.id);
    res.json({ success: true });
  } catch (error) {
    logger.error('Failed to remove member role', getErrorMessage(error));
    res.status(500).json({ error: 'Failed to remove role' });
  }
});

export default router;
