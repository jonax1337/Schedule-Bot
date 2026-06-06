import { prisma } from './database.repository.js';
import { runWithOrg } from '../shared/tenancy/orgContext.js';
import { logger, getErrorMessage } from '../shared/utils/logger.js';

/**
 * Organization (tenant) data access.
 *
 * Organization itself is NOT a tenant model, so these queries run without an
 * org context (the guard skips non-tenant models).
 */

export interface OrganizationData {
  id: string;
  slug: string;
  name: string;
  discordGuildId: string | null;
  discordChannelId: string | null;
  plan: string;
}

export async function getOrganizationBySlug(slug: string): Promise<OrganizationData | null> {
  return prisma.organization.findUnique({ where: { slug } });
}

export async function getOrganizationById(id: string): Promise<OrganizationData | null> {
  return prisma.organization.findUnique({ where: { id } });
}

/** All organizations (for the per-org scheduler tick). */
export async function getAllOrganizations(): Promise<OrganizationData[]> {
  return prisma.organization.findMany({ orderBy: { createdAt: 'asc' } });
}

export async function getOrganizationByGuildId(guildId: string): Promise<OrganizationData | null> {
  // guildId is no longer unique (a guild may host several teams), so findFirst.
  return prisma.organization.findFirst({ where: { discordGuildId: guildId } });
}

/** All orgs bound to a guild (>1 means Main/Academy-style sharing). */
export async function getOrganizationsByGuildId(guildId: string): Promise<OrganizationData[]> {
  return prisma.organization.findMany({ where: { discordGuildId: guildId } });
}

/** Resolve the org that posts in a given Discord channel (Main vs Academy). */
export async function getOrganizationByChannelId(channelId: string): Promise<OrganizationData | null> {
  if (!channelId) return null;
  return prisma.organization.findFirst({ where: { discordChannelId: channelId } });
}

/** Mirror a team's posting channel onto the org row so channel→org resolution works. */
export async function setOrgChannel(organizationId: string, channelId: string | null): Promise<void> {
  await prisma.organization.update({ where: { id: organizationId }, data: { discordChannelId: channelId || null } });
}

/** PoC: the control-plane owner account (admin login). Seeded by setup script. */
export const OWNER_ACCOUNT_ID = 'acc_owner';

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$/;
const RESERVED_SLUGS = new Set([
  'www', 'app', 'api', 'admin', 'mail', 'synqed', 'control', 'dashboard',
  'static', 'assets', 'default', 'support', 'help', 'status',
]);

/** Create/find a control-plane account by Discord id; returns its id. */
export async function upsertAccountByDiscordId(discordId: string, displayName: string): Promise<string> {
  const acc = await prisma.account.upsert({
    where: { discordId },
    update: { displayName },
    create: { discordId, displayName },
  });
  return acc.id;
}

export class SlugError extends Error {}

/** Validate a desired subdomain slug, throwing SlugError with a user-facing reason. */
export function normalizeSlug(raw: string): string {
  const slug = (raw || '').trim().toLowerCase();
  if (!SLUG_RE.test(slug)) {
    throw new SlugError('Slug must be 3–32 chars, lowercase letters/numbers/hyphens, no leading/trailing hyphen.');
  }
  if (RESERVED_SLUGS.has(slug)) throw new SlugError(`"${slug}" is reserved.`);
  return slug;
}

/** Create a new org and make the account its OWNER. Throws SlugError if the slug is invalid/taken. */
export async function createOrganizationWithOwner(
  accountId: string,
  rawSlug: string,
  name: string,
): Promise<OrganizationData> {
  const slug = normalizeSlug(rawSlug);
  if (await prisma.organization.findUnique({ where: { slug } })) {
    throw new SlugError(`"${slug}" is already taken.`);
  }
  const org = await prisma.organization.create({ data: { slug, name: name.trim() || slug } });
  await prisma.membership.create({ data: { accountId, organizationId: org.id, role: 'OWNER' } });

  // Seed the new team so its dashboard isn't empty on first open: default
  // settings + a 14-day schedule window, written inside the new org's context.
  // Don't fail team creation if seeding hiccups — the app still works on the
  // in-memory defaults and the scheduler backfills the window on its next tick.
  try {
    const { initializeOrganizationDefaults } = await import('./database-initializer.js');
    await runWithOrg(org.id, () => initializeOrganizationDefaults());
  } catch (err) {
    logger.error('New organization seeding failed', getErrorMessage(err));
  }

  return org;
}

/** Bind a Discord guild to an org (set when the bot is invited). */
export async function bindGuild(organizationId: string, guildId: string): Promise<void> {
  await prisma.organization.update({ where: { id: organizationId }, data: { discordGuildId: guildId } });
}

/** Account id for a Discord user, or null. Links player/OAuth login to an account. */
export async function getAccountIdByDiscordId(discordId: string): Promise<string | null> {
  const acc = await prisma.account.findUnique({ where: { discordId }, select: { id: true } });
  return acc?.id ?? null;
}

/** The Discord id behind an account (for roster lookups), or null. */
export async function getAccountDiscordId(accountId: string): Promise<string | null> {
  const acc = await prisma.account.findUnique({ where: { id: accountId }, select: { discordId: true } });
  return acc?.discordId ?? null;
}

export type OrgRoleValue = 'OWNER' | 'ADMIN' | 'MEMBER';

/** The account's role in an org, or null if it has no membership there. */
export async function getMembershipRole(accountId: string, organizationId: string): Promise<OrgRoleValue | null> {
  const m = await prisma.membership.findUnique({
    where: { accountId_organizationId: { accountId, organizationId } },
    select: { role: true },
  });
  return (m?.role as OrgRoleValue) ?? null;
}

/** Orgs the account may access (for the org switcher). */
export async function getAccountOrganizations(
  accountId: string,
): Promise<Array<{ slug: string; name: string; role: OrgRoleValue }>> {
  const memberships = await prisma.membership.findMany({
    where: { accountId },
    include: { organization: { select: { slug: true, name: true } } },
    orderBy: { organization: { name: 'asc' } },
  });
  return memberships.map((m) => ({ slug: m.organization.slug, name: m.organization.name, role: m.role as OrgRoleValue }));
}

/**
 * PoC: the org that the bot / scheduler / startup operate on when not inside an
 * HTTP request. Resolved by slug (env override, default "default") and cached.
 * Later this becomes a per-org loop / guildId resolution.
 */
const DEFAULT_ORG_SLUG = process.env.POC_DEFAULT_ORG_SLUG || 'default';
let cachedDefaultOrgId: string | null = null;

export async function getDefaultOrgId(): Promise<string> {
  if (cachedDefaultOrgId) return cachedDefaultOrgId;
  const org = await getOrganizationBySlug(DEFAULT_ORG_SLUG);
  if (!org) {
    throw new Error(
      `[tenancy] Default organization "${DEFAULT_ORG_SLUG}" not found. ` +
      `Run the PoC setup script (scripts/poc-tenancy-setup.ts) first.`,
    );
  }
  cachedDefaultOrgId = org.id;
  return org.id;
}
