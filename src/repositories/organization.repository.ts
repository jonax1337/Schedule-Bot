import { prisma } from './database.repository.js';

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

export async function getOrganizationByGuildId(guildId: string): Promise<OrganizationData | null> {
  // guildId is no longer unique (a guild may host several teams), so findFirst.
  return prisma.organization.findFirst({ where: { discordGuildId: guildId } });
}

/** PoC: the control-plane owner account (admin login). Seeded by setup script. */
export const OWNER_ACCOUNT_ID = 'acc_owner';

/** Account id for a Discord user, or null. Links player/OAuth login to an account. */
export async function getAccountIdByDiscordId(discordId: string): Promise<string | null> {
  const acc = await prisma.account.findUnique({ where: { discordId }, select: { id: true } });
  return acc?.id ?? null;
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
